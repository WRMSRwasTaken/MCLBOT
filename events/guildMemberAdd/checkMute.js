const winston = require('winston');

module.exports = {
  fn: async (main, member) => {
    winston.debug(`User ${member.user.tag} joined guild ${member.guild.name}, checking DB if the user is muted on that guild...`);

    main.prometheusMetrics.sqlReads.inc();

    const isMuted = await main.db.muted_members.findOne({
      where: {
        guild_id: member.guild.id,
        target_id: member.id,
      },
    });

    if (!isMuted) {
      return;
    }

    if (isMuted.target_tag !== member.user.tag) {
      winston.debug(`Updating mute DB information for changed user id ${member.user.id}...`);

      main.prometheusMetrics.sqlWrites.inc();

      main.db.muted_members.update({
        target_tag: member.user.tag,
      }, {
        where: {
          target_id: member.id,
        },
      });
    }

    if (isMuted.expires_at && isMuted.expires_at < Date.now() + 10000) {
      winston.debug(`User ${member.user.tag} joined guild ${member.guild.name} has been muted there, but the mute would expire in less than 10 seconds anyway, so we're going to discard the mute status...`);

      return;
    }

    winston.debug(`User ${member.user.tag} joined guild ${member.guild.name} but has been muted there, going to re-apply mute status...`);

    const context = {
      main,
      guild: member.guild,
      author: {
        id: isMuted.invoker_id,
      },
    };

    main.userHelper.muteMember(context, member, null, true);
  },
};

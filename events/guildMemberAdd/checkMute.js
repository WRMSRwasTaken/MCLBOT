const winston = require('winston');

module.exports = {
  fn: async (main, GuildMemberAdd) => {
    if (GuildMemberAdd.isDuplicate) {
      return;
    }

    winston.debug(`User ${GuildMemberAdd.member.user.tag} joined guild ${GuildMemberAdd.member.guild.name}, checking DB if the user is muted on that guild...`);

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const isMuted = await main.db.muted_members.findOne({
      where: {
        guild_id: GuildMemberAdd.member.guild.id,
        target_id: GuildMemberAdd.member.id,
      },
    });

    if (!isMuted) {
      return;
    }

    if (isMuted.target_tag !== GuildMemberAdd.member.user.tag) {
      winston.debug(`Updating mute DB information for changed user id ${GuildMemberAdd.member.user.id}...`);

      main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
      main.db.muted_members.update({
        target_tag: GuildMemberAdd.member.user.tag,
      }, {
        where: {
          target_id: GuildMemberAdd.member.id,
        },
      });
    }

    if (isMuted.expires_at && isMuted.expires_at < Date.now() + 10000) {
      winston.debug(`User ${GuildMemberAdd.member.user.tag} joined guild ${GuildMemberAdd.member.guild.name} has been muted there, but the mute would expire in less than 10 seconds anyway, so we're going to discard the mute status...`);

      return;
    }

    winston.debug(`User ${GuildMemberAdd.member.user.tag} joined guild ${GuildMemberAdd.member.guild.name} but has been muted there, going to re-apply mute status...`);

    const context = {
      main,
      guild: GuildMemberAdd.member.guild,
      author: {
        id: isMuted.invoker_id,
      },
    };

    main.userHelper.muteMember(context, GuildMemberAdd.member, null, true);
  },
};

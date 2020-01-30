const winston = require('winston');

module.exports = {
  fn: async (main, GuildMemberUpdate) => {
    if (GuildMemberUpdate.member.bot) {
      return;
    }

    if (GuildMemberUpdate.differences.nick === undefined) { // this could be null if a nick has been added, so we actually have to check explicitly for undefined here
      return;
    }

    main.prometheusMetrics.sqlCommands.labels('INSERT').inc();

    winston.debug(`Nickname changed for user ${GuildMemberUpdate.member.username}#${GuildMemberUpdate.member.discriminator} on guild ${GuildMemberUpdate.member.guild.name}: from ${GuildMemberUpdate.differences.nick} to ${GuildMemberUpdate.member.nick}`);

    main.db.name_logs.create({
      user_id: GuildMemberUpdate.member.id,
      type: 'NICKNAME',
      guild_id: GuildMemberUpdate.guildId,
      before: GuildMemberUpdate.differences.nick, // this is gonna be null if a nick has been added
      after: GuildMemberUpdate.member.nick, // this is gonna be null if a nick has been deleted
      timestamp: Date.now(),
    });
  },
};

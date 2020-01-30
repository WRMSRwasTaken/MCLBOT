const winston = require('winston');

module.exports = {
  fn: (main, GuildDelete) => {
    if (GuildDelete.isUnavailable) {
      return;
    }

    winston.info(`Bot has been removed from server ${GuildDelete.guild.name} (ID: ${GuildDelete.guild.id}).`);

    main.channelLogHelper.sendLogMessage('guildRemove', {
      name: GuildDelete.guild.name,
      id: GuildDelete.guild.id,
      iconURL: GuildDelete.guild.iconURL(),
      memberCount: GuildDelete.guild.memberCount,
      botCount: GuildDelete.guild.members.filter((u) => u.user.bot).size,
    });
  },
};

const winston = require('winston');

module.exports = {
  fn: (main, guild) => {
    winston.info(`Bot has been removed from server ${guild.name} (ID: ${guild.id}).`);

    main.channelLogHelper.sendLogMessage('guildRemove', {
      name: guild.name,
      id: guild.id,
      iconURL: guild.iconURL(),
      memberCount: guild.memberCount,
      botCount: guild.members.filter((u) => u.user.bot).size,
    });
  },
};

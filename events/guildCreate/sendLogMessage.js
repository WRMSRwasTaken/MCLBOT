const winston = require('winston');

module.exports = {
  fn: (main, guild) => {
    winston.info(`Bot has been added to server ${guild.name} (ID: ${guild.id}).`);

    main.channelLogHelper.sendLogMessage('guildCreate', {
      name: guild.name,
      id: guild.id,
      iconURL: guild.iconURL(),
      memberCount: guild.memberCount,
      botCount: guild.members.filter((u) => u.user.bot).size,
    });
  },
};

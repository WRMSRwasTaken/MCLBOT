const winston = require('winston');

module.exports = {
  fn: (main, GuildCreate) => {
    if (GuildCreate.fromUnavailable) {
      return;
    }

    winston.info(`Bot has been added to server ${GuildCreate.guild.name} (ID: ${GuildCreate.guild.id}).`);

    main.channelLogHelper.sendLogMessage('guildCreate', {
      name: GuildCreate.guild.name,
      id: GuildCreate.guild.id,
      iconURL: GuildCreate.guild.iconURL(),
      memberCount: GuildCreate.guild.memberCount,
      botCount: GuildCreate.guild.members.filter((u) => u.user.bot).size,
    });
  },
};

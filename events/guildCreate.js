const winston = require('winston');

module.exports = {
  fn: (main, guild) => {
    winston.info(`Bot has been added to server ${guild.name} (ID: ${guild.id}).`);

    const embed = new ctx.main.Discord.MessageEmbed();
  },
};

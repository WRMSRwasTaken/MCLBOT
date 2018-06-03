const winston = require('winston');
const nconf = require('nconf');

module.exports = {
  fn: (main, guild) => {
    winston.info(`Bot has been removed from server ${guild.name} (ID: ${guild.id}).`);

    if (nconf.get('bot:logchannel')) {
      const embed = new main.Discord.MessageEmbed();

      const botCount = guild.members.filter(u => u.user.bot).size;

      embed.setTitle(`Removed from ${guild.name}`);
      embed.addField('Users', guild.memberCount, true);
      embed.addField('Bots', botCount, true);
      embed.addField('Bots/Users Ratio', (Math.round(botCount / guild.memberCount * 1000) / 1000), true);
      embed.setThumbnail(guild.iconURL());
      embed.setFooter(`Server ID: ${guild.id}`);
      embed.setColor(0xff3333);

      main.api.channels.get(nconf.get('bot:logchannel')).send({
        embed,
      });
    }
  },
};

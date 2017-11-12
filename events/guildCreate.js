const winston = require('winston');
const nconf = require('nconf');

module.exports = {
  fn: (main, guild) => {
    winston.info(`Bot has been added to server ${guild.name} (ID: ${guild.id}).`);

    if (nconf.get('bot:logchannel')) {
      const embed = new main.Discord.MessageEmbed();

      const botCount = guild.members.filter(u => u.user.bot).size;
      const botFarm = botCount / guild.memberCount > 0.5 && guild.memberCount > 10;

      embed.setTitle(`Added to ${guild.name}`);
      if (botFarm) embed.setDescription(`⚠ This server might be a bot farm (~${Math.round(botCount / guild.memberCount * 100)}% bots)`);
      embed.addField('Users', guild.memberCount, true);
      embed.addField('Bots', botCount, true);
      embed.addField('Bots/Users Ratio', (Math.round(botCount / guild.memberCount * 1000) / 1000), true);
      embed.setThumbnail(guild.iconURL());
      embed.setFooter(`Server ID: ${guild.id}`);
      embed.setColor(botFarm ? 0xffff33 : 0x33ff33);

      main.api.channels.get(nconf.get('bot:logchannel')).send({
        embed,
      });
    }
  },
};

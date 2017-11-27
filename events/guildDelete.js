const winston = require('winston');
const nconf = require('nconf');

module.exports = {
  fn: (main, guild) => {
    winston.info(`Bot has been removed from server ${guild.name} (ID: ${guild.id}).`);

    main.prometheusMetrics.sqlWrites.inc();

    main.prefixHelper.deleteGuildPrefix(guild.id);

    main.prometheusMetrics.influxWrites.inc(4);
    main.influx.query(`delete from member_message where guild_id = ${main.Influx.escape.stringLit(guild.id)}`);
    main.influx.query(`delete from member_status where guild_id = ${main.Influx.escape.stringLit(guild.id)}`);
    main.influx.query(`delete from member_join where guild_id = ${main.Influx.escape.stringLit(guild.id)}`);
    main.influx.query(`delete from member_leave where guild_id = ${main.Influx.escape.stringLit(guild.id)}`);

    main.prometheusMetrics.sqlWrites.inc();

    main.db.blacklist.destroy({
      where: {
        $or: [
          {
            $and: {
              guild_id: guild.id,
              user_id: {
                $ne: 0,
              },
            },
          },
          {
            $and: {
              guild_id: guild.id,
              channel_id: {
                $ne: 0,
              },
            },
          },
        ],
      },
    });

    if (nconf.get('bot:logchannel')) {
      const embed = new main.Discord.MessageEmbed();

      const botCount = guild.members.filter((u) => u.user.bot).size;

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

const winston = require('winston');

module.exports = {
  fn: (main, guild) => {
    winston.info(`Bot has been removed from server ${guild.name} (ID: ${guild.id}).`);

    main.prometheusMetrics.sqlWrites.inc();

    main.prefixHelper.deleteServerPrefix(guild.id);

    main.influx.dropSeries({
      where: e => e.tag('server_id').equals.value(guild.id),
      database: 'member_message',
    });

    main.influx.dropSeries({
      where: e => e.tag('server_id').equals.value(guild.id),
      database: 'member_status',
    });

    main.prometheusMetrics.sqlWrites.inc();

    main.db.blacklist.destroy({
      where: {
        $or: [
          {
            $and: {
              server_id: guild.id,
              user_id: {
                $ne: 0,
              },
            },
          },
          {
            $and: {
              server_id: guild.id,
              channel_id: {
                $ne: 0,
              },
            },
          },
        ],
      },
    });
  },
};

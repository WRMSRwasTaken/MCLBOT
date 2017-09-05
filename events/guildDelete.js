const winston = require('winston');

module.exports = {
  fn: (main, guild) => {
    winston.info(`Bot has been removed from server ${guild.name} (ID: ${guild.id}).`);

    main.prometheusMetrics.sqlWrites.inc();

    main.prefixHelper.deleteServerPrefix(guild.id);

    main.prometheusMetrics.influxWrites.inc(4);
    main.influx.query(`delete from member_message where server_id = ${main.Influx.escape.stringLit(guild.id)}`);
    main.influx.query(`delete from member_status where server_id = ${main.Influx.escape.stringLit(guild.id)}`);
    main.influx.query(`delete from member_join where server_id = ${main.Influx.escape.stringLit(guild.id)}`);
    main.influx.query(`delete from member_leave where server_id = ${main.Influx.escape.stringLit(guild.id)}`);

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

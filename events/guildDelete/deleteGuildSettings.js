module.exports = {
  fn: (main, guild) => {
    main.prometheusMetrics.sqlWrites.inc();

    main.prefixHelper.deleteGuildPrefix(guild.id);

    main.prometheusMetrics.influxWrites.inc(4);
    main.influx.query(`delete from member_message where guild_id = ${main.Influx.escape.stringLit(guild.id)}`);
    main.influx.query(`delete from member_status where guild_id = ${main.Influx.escape.stringLit(guild.id)}`);
    main.influx.query(`delete from member_join where guild_id = ${main.Influx.escape.stringLit(guild.id)}`);
    main.influx.query(`delete from member_leave where guild_id = ${main.Influx.escape.stringLit(guild.id)}`);

    main.prometheusMetrics.sqlWrites.inc();

    const Op = main.db.Sequelize.Op;

    main.db.blacklist.destroy({
      where: {
        [Op.or]: [
          {
            [Op.and]: {
              guild_id: guild.id,
              user_id: {
                [Op.ne]: 0,
              },
            },
          },
          {
            [Op.and]: {
              guild_id: guild.id,
              channel_id: {
                [Op.ne]: 0,
              },
            },
          },
        ],
      },
    });
  },
};

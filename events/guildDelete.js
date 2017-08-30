const winston = require('winston');

module.exports = {
  fn: (main, guild) => {
    winston.info(`Bot has been removed from server ${guild.name} (ID: ${guild.id}).`);

    main.prometheusMetrics.sqlWrites.inc();

    main.prefixHelper.deleteServerPrefix(guild.id);

    main.prometheusMetrics.sqlWrites.inc();

    main.db.member_last_message.destroy({
      where: {
        server_id: guild.id,
      },
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

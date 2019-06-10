module.exports = {
  interval: 30,
  fn: (main) => {
    main.prometheusMetrics.guildCount.set(main.api.guilds.size || 0);
    main.prometheusMetrics.userCacheCount.set(main.api.users.size || 0);
    main.prometheusMetrics.uptime.set(Date.now() - main.processStartTime);
    main.prometheusMetrics.latency.set(main.api.ws.ping || 0);
    main.prometheusMetrics.dbConnections.set(main.db.sequelize.connectionManager.pool._count); // eslint-disable-line no-underscore-dangle
  },
};

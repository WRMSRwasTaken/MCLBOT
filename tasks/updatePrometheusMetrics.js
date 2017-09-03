module.exports = {
  interval: 60,
  fn: (main) => {
    if (!main.initialized) {
      return;
    }

    main.prometheusMetrics.serverCountGauge.set(main.api.guilds.size || 0);
    main.prometheusMetrics.userCacheCountGauge.set(main.api.users.size || 0);
    main.prometheusMetrics.uptime.set(Date.now() - main.startTime);
    main.prometheusMetrics.latency.set(main.api.ping || 0);
  },
};

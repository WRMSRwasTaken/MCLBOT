const tasks = {};

tasks.updateMetrics = {
  name: 'updateMetrics',
  interval: 60,
  fn: (main) => {
    main.prometheusMetrics.serverCountGauge.set(main.api.guilds.size);
    main.prometheusMetrics.userCacheCountGauge.set(main.api.users.size);
    main.prometheusMetrics.uptime.set(Date.now() - main.startTime);
    main.prometheusMetrics.latency.set(main.api.ping);
  },
};

module.exports = tasks;

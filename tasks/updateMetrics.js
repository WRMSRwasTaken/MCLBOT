const tasks = {};

tasks.updateMetrics = {
  name: 'updateMetrics',
  interval: 60,
  fn: (main) => {
    main.prometheusMetrics.serverCountGauge.set(main.api.guilds.size);
    main.prometheusMetrics.userCacheCountGauge.set(main.api.users.size);
  },
};

module.exports = tasks;

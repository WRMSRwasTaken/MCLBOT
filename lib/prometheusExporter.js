const prom = require('prom-client');
const promGC = require('prometheus-gc-stats');
const nconf = require('nconf');
const winston = require('winston');
const express = require('express')();

class PrometheusExporter { // TODO: use labels for shard numbers
  constructor(main) {
    this.main = main;
  }

  init() {
    winston.debug('Initializing Prometheus metrics exporting engine...');

    prom.collectDefaultMetrics();
    promGC()();

    const wsGauge = new prom.Counter({ name: 'mclbot_websocket_events', help: 'Number websocket events the bot received', labelNames: ['eventName'] });

    this.main.api.on('raw', (event) => {
      wsGauge.labels(event.t).inc();
    });

    this.main.prometheusMetrics = {};
    this.main.api.prometheus = this.main.prometheusMetrics; // we need to reference the metrics object to the d.js client object in order to be able to access it via broadcastEval()

    this.main.prometheusMetrics.uptime = new prom.Gauge({ name: 'mclbot_uptime', help: 'Number of milliseconds the bot has been running so far' });
    this.main.prometheusMetrics.latency = new prom.Gauge({ name: 'mclbot_latency', help: 'Heartbeat latency in milliseconds' });

    this.main.prometheusMetrics.guildCount = new prom.Gauge({ name: 'mclbot_server_count', help: 'Number of servers the bot is member of' });
    this.main.prometheusMetrics.userCacheCount = new prom.Gauge({ name: 'mclbot_user_cache_count', help: 'Number of users the bot has cached' });
    this.main.prometheusMetrics.statsCollectionDuration = new prom.Gauge({ name: 'mclbot_stats_collection_duration', help: 'Duration for one run to gather all guild stats' });

    this.main.prometheusMetrics.commandInvocations = new prom.Counter({ name: 'mclbot_command_invokations', help: 'Number of commands the bot executed', labelNames: ['commandName'] });
    this.main.prometheusMetrics.commandExecutionTimes = new prom.Gauge({ name: 'mclbot_command_execution_times', help: 'Command execution times', labelNames: ['commandName'] });

    this.main.prometheusMetrics.dbConnections = new prom.Gauge({ name: 'mclbot_db_connections', help: 'Number active connections to the backend SQL database', labelNames: ['DMLCommand'] });

    this.main.prometheusMetrics.sqlCommands = new prom.Counter({ name: 'mclbot_sql_commands', help: 'Number of SQL statements the bot sent to the backend SQL database', labelNames: ['DMLCommand'] });
    this.main.prometheusMetrics.redisCommands = new prom.Counter({ name: 'mclbot_redis_commands', help: 'Number of Redis commands the bot sent to the backend Redis database', labelNames: ['commandName'] });

    express.use('/metrics', (req, res, next) => {
      res.write(prom.register.metrics());
      res.end();
    });

    if (this.main.shardMaster || !this.main.api.shard) {
      try {
        express.listen(nconf.get('prometheus:port'));
      } catch (ex) {
        winston.error('Could not listen on port %s!', nconf.get('prometheus:port'));
        return;
      }

      winston.info(`Prometheus metrics can be found at: 0.0.0.0:${nconf.get('prometheus:port')}/metrics`);
    }
  }
}

module.exports = PrometheusExporter;

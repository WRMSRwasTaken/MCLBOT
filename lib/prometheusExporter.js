const client = require('prom-client');
const nconf = require('nconf');
const winston = require('winston');
const express = require('express')();

class PrometheusExporter {
  constructor(main) {
    this.main = main;
  }

  init() {
    winston.debug('Initializing Prometheus metrics exporting engine...');

    client.collectDefaultMetrics();

    express.use('/metrics', (req, res, next) => {
      res.write(client.register.metrics());
    });

    express.listen(nconf.get('prometheus:port'));

    winston.info(`Prometheus metrics can be found at: 0.0.0.0:${nconf.get('prometheus:port')}/metrics`);

    this.main.prometheusMetrics = {};

    this.main.prometheusMetrics.uptime = new client.Gauge({ name: 'mclbot_uptime', help: 'Number of milliseconds the bot has been running so far' });
    this.main.prometheusMetrics.latency = new client.Gauge({ name: 'mclbot_latency', help: 'Heartbeat latency in milliseconds' });
    this.main.prometheusMetrics.serverCountGauge = new client.Gauge({ name: 'mclbot_server_count', help: 'Number of servers the bot is member of' });
    this.main.prometheusMetrics.websocketEventCountGauge = new client.Gauge({ name: 'mclbot_websocket_events', help: 'Number websocket events the bot received' });
    this.main.prometheusMetrics.commandContGauge = new client.Gauge({ name: 'mclbot_command_count', help: 'Number of commands the bot executed' });
    this.main.prometheusMetrics.userCacheCountGauge = new client.Gauge({ name: 'mclbot_user_cache_count', help: 'Number of users the bot has cached' });
    this.main.prometheusMetrics.messageCountGauge = new client.Gauge({ name: 'mclbot_message_count', help: 'Number of messages the bot received' });
    this.main.prometheusMetrics.messageUpdateCountGauge = new client.Gauge({ name: 'mclbot_message_update_count', help: 'Number of message updates the bot received' });
    this.main.prometheusMetrics.messageDeleteCountGauge = new client.Gauge({ name: 'mclbot_message_delete_count', help: 'Number of message deletes the bot received' });
    this.main.prometheusMetrics.sqlReads = new client.Gauge({ name: 'mclbot_sql_reads', help: 'Number of SQL SELECT queries' });
    this.main.prometheusMetrics.sqlWrites = new client.Gauge({ name: 'mclbot_sql_writes', help: 'Number of SQL UPDATE, INSERT and DELETE queries' });
  }
}

module.exports = PrometheusExporter;
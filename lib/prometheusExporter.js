const prom = require('prom-client');
const promGC = require('prometheus-gc-stats');
const nconf = require('nconf');
const winston = require('winston');
const express = require('express')();

class PrometheusExporter {
  constructor(main) {
    this.main = main;
  }

  init() {
    winston.debug('Initializing Prometheus metrics exporting engine...');

    prom.collectDefaultMetrics();
    promGC()();
    const websocketEvents = [
      'channelCreate',
      'channelDelete',
      'channelPinsUpdate',
      'channelUpdate',
      'clientUserSettingsUpdate',
      'emojiCreate',
      'emojiDelete',
      'emojiUpdate',
      'guildBanAdd',
      'guildBanRemove',
      'guildCreate',
      'guildDelete',
      'guildMemberAdd',
      'guildMemberAvailable',
      'guildMemberRemove',
      'guildMembersChunk',
      'guildMemberSpeaking',
      'guildMemberUpdate',
      'guildUnavailable',
      'guildUpdate',
      'message',
      'messageDelete',
      'messageDeleteBulk',
      'messageReactionAdd',
      'messageReactionRemove',
      'messageReactionRemoveAll',
      'messageUpdate',
      'presenceUpdate',
      'roleCreate',
      'roleDelete',
      'roleUpdate',
      'typingStart',
      'typingStop',
      'userNoteUpdate',
      'userUpdate',
      'voiceStateUpdate',
    ];

    this.main.prometheusMetrics = {};
    this.main.api.prometheus = this.main.prometheusMetrics; // we need to reference the metrics object to the d.js client object in order to be able to access it via broadcastEval()

    this.main.prometheusMetrics.uptime = new prom.Gauge({ name: 'mclbot_uptime', help: 'Number of milliseconds the bot has been running so far' });
    this.main.prometheusMetrics.latency = new prom.Gauge({ name: 'mclbot_latency', help: 'Heartbeat latency in milliseconds' });
    this.main.prometheusMetrics.serverCountGauge = new prom.Gauge({ name: 'mclbot_server_count', help: 'Number of servers the bot is member of' });
    this.main.prometheusMetrics.websocketEventCountGauge = new prom.Counter({ name: 'mclbot_websocket_events', help: 'Number websocket events the bot received', labelNames: ['eventName'] });
    this.main.prometheusMetrics.commandCountGauge = new prom.Counter({ name: 'mclbot_command_count', help: 'Number of commands the bot executed' });
    this.main.prometheusMetrics.userCacheCountGauge = new prom.Gauge({ name: 'mclbot_user_cache_count', help: 'Number of users the bot has cached' });
    this.main.prometheusMetrics.sqlReads = new prom.Counter({ name: 'mclbot_sql_reads', help: 'Number of SQL SELECT queries' });
    this.main.prometheusMetrics.sqlWrites = new prom.Counter({ name: 'mclbot_sql_writes', help: 'Number of SQL UPDATE, INSERT and DELETE queries' });
    this.main.prometheusMetrics.influxReads = new prom.Counter({ name: 'mclbot_influx_reads', help: 'Number of InfluxDB read queries' });
    this.main.prometheusMetrics.influxWrites = new prom.Counter({ name: 'mclbot_influx_writes', help: 'Number of InfluxDB write queries' });
    this.main.prometheusMetrics.redisReads = new prom.Counter({ name: 'mclbot_redis_reads', help: 'Number of Redis read queries' });
    this.main.prometheusMetrics.redisWrites = new prom.Counter({ name: 'mclbot_redis_writes', help: 'Number of Redis write queries' });

    for (const eventName of websocketEvents) {
      this.main.api.on(eventName, (eventArg) => {
        this.main.prometheusMetrics.websocketEventCountGauge.labels(eventName).inc();
      });
    }

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

const winston = require('winston');
const prettyMs = require('pretty-ms');
const nconf = require('nconf');

class Watchdog {
  constructor(main) {
    this.main = main;
  }

  start() {
    if (!nconf.get('bot:wdCheckInterval') || !nconf.get('bot:wdMaxPingTimestampDiff')) {
      winston.debug('Watchdog has been disabled.');
      return;
    }

    winston.debug(`Watchdog started. Check interval is ${prettyMs(nconf.get('bot:wdCheckInterval'))}. Restarting on exceeding ${prettyMs(nconf.get('bot:wdMaxPingTimestampDiff'))}.`);

    setInterval(this.tick.bind(this), nconf.get('bot:wdCheckInterval'));
  }

  tick() {
    const pingTimestampDiff = Date.now() - this.main.api.ws.connection.lastPingTimestamp;

    // winston.debug(`Last heartbeat was ${prettyMs(pingTimestampDiff)} ago`);

    if (pingTimestampDiff >= nconf.get('bot:wdMaxPingTimestampDiff')) {
      winston.warn(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} max` : 'Max'} heartbeat time of ${prettyMs(nconf.get('bot:wdMaxPingTimestampDiff'))} exceeded. Exiting.`);
      this.main.shutdown(1);
    }
  }
}

module.exports = Watchdog;

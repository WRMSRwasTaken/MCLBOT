const winston = require('winston');
const prettyMs = require('pretty-ms');

class Watchdog {
  constructor(main) {
    this.main = main;
    this.checkInterval = 10000;
    this.maxPingTimestampDiff = 120000;
  }

  start() {
    winston.debug(`Watchdog started. Check interval is ${prettyMs(this.checkInterval)}. Restarting on exceeding ${prettyMs(this.maxPingTimestampDiff)}.`);

    setInterval(this.tick.bind(this), this.checkInterval);
  }

  tick() {
    const pingTimestampDiff = Date.now() - this.main.api.ws.connection.lastPingTimestamp;

    // winston.debug(`Last heartbeat was ${prettyMs(pingTimestampDiff)} ago`);

    if (pingTimestampDiff >= this.maxPingTimestampDiff) {
      winston.warn(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} max` : 'Max'} heartbeat time of ${prettyMs(this.maxPingTimestampDiff)} exceeded. Exiting.`);
      this.main.exit(1);
    }
  }
}

module.exports = Watchdog;

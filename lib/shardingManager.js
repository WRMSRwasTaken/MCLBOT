const winston = require('winston');
const nconf = require('nconf');
const path = require('path');

class ShardingManager {
  constructor(main) {
    this.main = main;

    this.promiseShutdownList = [];
    this.shardList = [];

    if (Number.isNaN(nconf.get('bot:shards'))) {
      winston.error('The amount of shards to spawn must be a number!');

      process.exit(1);
    } else {
      this.shardCount = parseInt(nconf.get('bot:shards'), 10);
    }
  }

  async launchShards() { // TODO: there's still somewhere a rejected promise if a shard does not get ready in time
    this.shardManager = new this.main.Discord.ShardingManager(path.resolve('./', 'bot.js'), {
      token: nconf.get('bot:token'),
      totalShards: this.shardCount,
    });

    this.shardManager.on('error', err => winston.error(err.message));

    for (let i = 0; i < this.shardCount; i++) {
      const shard = this.shardManager.createShard(i);

      this.shardList[i] = shard; // We are not going to use the "shardCreate" event here, because it seems that the sharding manager only pushes the shard to it's internal "shards" array property only if the shard has been successfully launched

      delete this.promiseShutdownList[i];

      this.attachListeners(shard);

      shard.spawn(false);

      if (nconf.get('bot:waitForReady')) {
        await new Promise((resolve) => {
          shard.on('ready', () => {
            resolve();
          });
        });
      } else {
        await Promise.delay(5000);
      }
    }
  }

  async shutdown(sendSignal = false) {
    if (sendSignal) {
      this.shardManager.broadcastEval('this.main.shutdown(0)');
    }

    winston.info('Application shutdown requested. Going to wait until all shards are shut down...');

    if (this.shardManager) {
      this.shardManager.respawn = false;
    }

    for (const shard of this.shardList) {
      this.promiseShutdownList[shard.id] = new Promise((resolve) => {
        shard.on('death', () => {
          resolve();
        });
      });
    }

    await Promise.all(this.promiseShutdownList);

    winston.info('No shard is running anymore. Exiting.');
    process.exit(0);
  }

  attachListeners(shard) {
    shard.on('message', (message) => {
      if (message.message) {
        switch (message.message) {
          case 'logChannelHere':
            winston.info('We were notified by shard id %d that it is in the guild containing the logging channel.', shard.id);

            this.logChannelShard = shard;

            break;
          case 'shutdown':
            this.shutdown(true);

            break;

          default:
            if (this.logChannelShard) {
              this.logChannelShard.eval(`this.main.channelLogHelper.sendChannelMessage(${JSON.stringify(message)})`);
            }
        }
      }
    });
  }
}

module.exports = ShardingManager;

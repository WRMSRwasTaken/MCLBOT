const winston = require('winston');
const nconf = require('nconf');

class ShardingManager {
  constructor(main) {
    this.main = main;

    this.promiseList = [];
    this.shardList = [];
  }

  async launchShards() {
    this.shardManager = new this.main.Discord.ShardingManager(process.argv[1], {
      token: nconf.get('bot:token'),
    });

    this.shardManager.on('shardCreate', (shard) => {
      this.shardList[shard.id] = shard; // it seems that the sharding manager only pushes the shard to it's internal "shards" array property only if the shard has been successfully launched

      delete this.promiseList[shard.id];

      this.attachListeners(shard);
    });

    if (nconf.get('bot:shard') === 'auto') {
      this.shardManager.spawn('auto');
    } else {
      this.shardManager.spawn(parseInt(nconf.get('bot:shard'), 10));
    }
  }

  async shutdown() {
    winston.info('Application shutdown requested. Going to wait until all shards are shut down...');

    this.shardManager.respawn = false;

    for (const shard of this.shardList) {
      this.promiseList[shard.id] = new Promise((resolve, reject) => {
        shard.on('death', () => {
          resolve();
        });
      });
    }

    await Promise.all(this.promiseList);

    winston.info('No shard is running anymore. Exiting.');
    process.exit(0);
  }

  attachListeners(shard) {
    shard.on('message', (message) => {
      if (message.message === 'logChannelHere') {
        winston.info('We were notified by shard id %d that it is in the guild containing the logging channel.', shard.id);

        this.logChannelShard = shard;
      } else if (message.message && this.logChannelShard) {
        this.logChannelShard.eval(`this.main.channelLogHelper.sendChannelMessage(${JSON.stringify(message)})`);
      }
    });
  }
}

module.exports = ShardingManager;

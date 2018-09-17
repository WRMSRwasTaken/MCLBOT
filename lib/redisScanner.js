const winston = require('winston');
const nconf = require('nconf');
const Bluebird = require('bluebird');

class RedisScanner {
  constructor(main) {
    this.main = main;
  }

  async deleteKeys(pattern) {
    winston.debug('Going to scan and delete the redis db with matching keys: %s', `${nconf.get('redis:prefix')}${pattern}`);

    return new Bluebird(async (resolve) => {
      let deletedKeys = 0;

      const stream = this.main.redis.scanStream({
        match: `${nconf.get('redis:prefix')}${pattern}`,
        count: 100,
      });

      stream.on('data', async (keys) => {
        stream.pause();

        deletedKeys += keys.length;

        for (const key of keys) {
          await this.main.redis.del(key);
        }

        stream.resume();
      });

      stream.on('end', () => {
        winston.debug('Deleted %d keys matching the pattern: %s', deletedKeys, `${nconf.get('redis:prefix')}${pattern}`);

        resolve(deletedKeys);
      });
    });
  }
}

module.exports = RedisScanner;

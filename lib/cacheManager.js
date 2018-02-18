const Bluebird = require('bluebird');
const nconf = require('nconf');

class CacheManager {
  constructor(main) {
    this.main = main;
  }

  async getCache(key, refreshTTL = true) {
    return new Bluebird(async (resolve) => {
      this.main.prometheusMetrics.redisReads.inc();

      const redisResult = await this.main.redis.get(`cache:${key}`);

      if (redisResult) {
        this.main.prometheusMetrics.redisWrites.inc();

        if (refreshTTL) this.main.redis.expire(`cache:${key}`, nconf.get('bot:redisCacheDefaultTTL'));
      }

      resolve(redisResult);
    });
  }

  setCache(key, value) {
    this.main.prometheusMetrics.redisWrites.inc();

    this.main.redis.set(`cache:${key}`, value, 'EX', nconf.get('bot:redisCacheDefaultTTL'));
  }

  deleteCache(key) {
    this.main.prometheusMetrics.redisWrites.inc();

    this.main.redis.del(`cache:${key}`);
  }
}

module.exports = CacheManager;

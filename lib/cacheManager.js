const Bluebird = require('bluebird');

class CacheManager {
  constructor(main) {
    this.main = main;

    this.ttl = 300;
  }

  async getCache(key, refreshTTL = true) {
    return new Bluebird(async (resolve, reject) => {
      this.main.prometheusMetrics.redisReads.inc();

      const redisResult = await this.main.redis.get(`cache:${key}`);

      if (redisResult) {
        this.main.prometheusMetrics.redisWrites.inc();

        if (refreshTTL) this.main.redis.expire(`cache:${key}`, this.ttl);
      }

      resolve(redisResult);
    });
  }

  setCache(key, value) {
    this.main.prometheusMetrics.redisWrites.inc();

    this.main.redis.set(`cache:${key}`, value, 'EX', this.ttl);
  }

  deleteCache(key) {
    this.main.prometheusMetrics.redisWrites.inc();

    this.main.redis.del(`cache:${key}`);
  }
}

module.exports = CacheManager;

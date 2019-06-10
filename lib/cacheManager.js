const Bluebird = require('bluebird');
const nconf = require('nconf');

class CacheManager {
  constructor(main) {
    this.main = main;
  }

  async getCache(key, refreshTTL = true) {
    return new Bluebird(async (resolve) => {
      this.main.prometheusMetrics.redisCommands.labels('GET').inc();
      const redisResult = await this.main.redis.get(`cache:${key}`);

      if (redisResult) {
        this.main.prometheusMetrics.redisCommands.labels('EXPIRE').inc();
        if (refreshTTL) this.main.redis.expire(`cache:${key}`, nconf.get('bot:redisCacheDefaultTTL'));
      }

      resolve(redisResult);
    });
  }

  setCache(key, value) {
    this.main.prometheusMetrics.redisCommands.labels('SET').inc();
    this.main.redis.set(`cache:${key}`, value, 'EX', nconf.get('bot:redisCacheDefaultTTL'));
  }

  deleteCache(key) {
    this.main.prometheusMetrics.redisCommands.labels('DEL').inc();
    this.main.redis.del(`cache:${key}`);
  }
}

module.exports = CacheManager;

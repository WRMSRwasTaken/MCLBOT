import Bluebird from 'bluebird';
import nconf from 'nconf';

import {MCLBOTMain, MCLBOTModule} from '../definitions.js';

export default class CacheManager implements MCLBOTModule{
  private main = {} as MCLBOTMain;
  constructor(main: MCLBOTMain) {
    this.main = main;
  }

  initializeModule() {
    return;
  }

  async getCache(key: string, refreshTTL = true): Promise<string | false> {
    return new Bluebird(async (resolve) => {
      // this.main.prometheusMetrics.redisCommands.labels('GET').inc();
      const redisResult = await this.main.redis.get(`cache:${key}`) || false;

      if (redisResult) {
        // this.main.prometheusMetrics.redisCommands.labels('EXPIRE').inc();
        if (refreshTTL) this.main.redis.expire(`cache:${key}`, nconf.get('bot:redisCacheDefaultTTL'));
      }

      resolve(redisResult);
    });
  }

  setCache(key: string, value: string): void {
    // this.main.prometheusMetrics.redisCommands.labels('SET').inc();
    this.main.redis.set(`cache:${key}`, value, 'EX', nconf.get('bot:redisCacheDefaultTTL'));
  }

  deleteCache(key: string): void {
    // this.main.prometheusMetrics.redisCommands.labels('DEL').inc();
    this.main.redis.del(`cache:${key}`);
  }
}

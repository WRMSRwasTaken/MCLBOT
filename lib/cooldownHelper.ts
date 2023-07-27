import nconf from 'nconf';

import {MCLBOTMain, MCLBOTContext, MCLBOTModule} from '../definitions.js';

export default class CooldownHelper implements MCLBOTModule{
  private main = {} as MCLBOTMain;
  constructor(main: MCLBOTMain) {
    this.main = main;
  }

  initializeModule() {
    return;
  }

  async hasCooldown(context: MCLBOTContext): Promise<boolean> {
    if (context.isBotAdmin) {
      return false;
    }

    let cooldown = this.main.modules.commandHandler.getProperty(context, 'cooldown');

    if (cooldown === false) { // cooldown has been disabled by category / command / subcommand
      return false;
    }

    if (cooldown === undefined) { // command / subcommand has no cooldown set, so we're going to use the default rates
      cooldown = {
        actions: nconf.get('bot:defaultCooldownActions'),
        period: nconf.get('bot:defaultCooldownPeriod'),
      };
    }

    // poor man's leaky bucket done with redis

    const key = `cooldown:${context.author.id}:${context.command.name}${(context.subcommand) ? `:${context.subcommand.name}` : ''}`;
    const notifyKey = `notify${key}`;

    // this.main.prometheusMetrics.redisCommands.labels('ZRANGE').inc();
    const hasWaterDrops = await this.main.redis.zrange(key, 0, 0);

    if (hasWaterDrops.length === 0) { // no drops in the bucket at all
      return false; // return here to avoid unnecessary calls to redis
    }

    // this.main.prometheusMetrics.redisCommands.labels('ZREMRANGEBYSCORE').inc();
    await this.main.redis.zremrangebyscore(key, 0, Date.now() - cooldown.period * 1000); // clear expired water drops

    // this.main.prometheusMetrics.redisCommands.labels('ZCOUNT').inc();
    const calls = await this.main.redis.zcount(key, '-inf', '+inf');

    if (calls >= cooldown.actions) {
      // this.main.prometheusMetrics.redisCommands.labels('GET').inc();
      const cooldownNotified = await this.main.redis.get(notifyKey);

      if (!cooldownNotified) { // We want to print the cooldown messageCreate only one time while the cooldown is active
        // this.main.prometheusMetrics.redisCommands.labels('ZRANGE').inc();
        const firstWaterDrop = await this.main.redis.zrange(key, 0, 0); // let's get the first water drop again, because the previous one could've been deleted by zremrangebyscore

        if(!firstWaterDrop[0]) {
          return false;
        }

        const waitTime = Number.parseInt(firstWaterDrop[0], 10) + cooldown.period * 1000 - Date.now();

        // this.main.prometheusMetrics.redisCommands.labels('SET').inc();
        this.main.redis.set(notifyKey, 1, 'EX', Math.round(waitTime / 1000) + 2);

        context.reply(`Cooldown! Please wait another ${Math.round(waitTime / 100) / 10} seconds before executing \`${context.command.name}\` again.`);
      }

      return true;
    }

    // this.main.prometheusMetrics.redisCommands.labels('DEL').inc();
    this.main.redis.del(notifyKey); // Delete the "already notified key" if the command hasn't been blocked by the cooldown, so we can display it again if a command has been run

    return false;
  }

  async commandCall(context: MCLBOTContext): Promise<number | false> {
    if (context.isBotAdmin) {
      return false;
    }

    let cooldown = this.main.modules.commandHandler.getProperty(context, 'cooldown');

    if (cooldown === false) { // cooldown has been disabled by category / command / subcommand
      return false;
    }

    if (cooldown === undefined) { // command / subcommand has no cooldown set, so we're going to use the default rates
      cooldown = {
        actions: nconf.get('bot:defaultCooldownActions'),
        period: nconf.get('bot:defaultCooldownPeriod'),
      };
    }

    const key = `cooldown:${context.author.id}:${context.command.name}${(context.subcommand) ? `:${context.subcommand.name}` : ''}`;

    const now = Date.now();

    // this.main.prometheusMetrics.redisCommands.labels('ZADD').inc();
    await this.main.redis.zadd(key, now, now);

    // this.main.prometheusMetrics.redisCommands.labels('EXPIRE').inc();
    return this.main.redis.expire(key, cooldown.period + 2); // add a / refresh the TTL to the set to save space
  }
}

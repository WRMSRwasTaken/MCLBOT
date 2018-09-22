const nconf = require('nconf');

/*

This event gets triggered multiple times per user (to be exact: for every guild in common with the presence changing user),
so we need some sort of a debounce system to wait for all presence updates to finish but still just update the database once per user

 */

const pendingUpdates = {};

module.exports = {
  fn: (main, oldPresence, newPresence) => {
    if (newPresence.status === 'offline') {
      if (!pendingUpdates[newPresence.user.id]) {
        setTimeout(() => {
          main.prometheusMetrics.redisWrites.inc();

          main.redis.set(`user_last_seen:${newPresence.user.id}`, pendingUpdates[newPresence.user.id], 'EX', nconf.get('bot:redisStoreTTL'));

          delete pendingUpdates[newPresence.user.id];
        }, 5000);
      }

      pendingUpdates[newPresence.user.id] = Date.now();
    }
  },
};

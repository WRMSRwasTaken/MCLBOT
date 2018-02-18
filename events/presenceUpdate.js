const moment = require('moment');
const nconf = require('nconf');

const pendingUpdates = {};

module.exports = {
  fn: (main, oldMember, newMember) => {
    if (newMember.presence.status === 'offline') {
      if (!pendingUpdates[newMember.user.id]) {
        setTimeout(() => {
          main.prometheusMetrics.redisWrites.inc();

          main.redis.set(`user_last_seen:${newMember.user.id}`, pendingUpdates[newMember.user.id], 'EX', nconf.get('bot:redisStoreTTL'));

          delete pendingUpdates[newMember.user.id];
        }, 5000);
      }

      pendingUpdates[newMember.user.id] = moment().unix() * 1000;
    }
  },
};

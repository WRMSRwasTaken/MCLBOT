const moment = require('moment');

const pendingUpdates = {};

module.exports = {
  fn: (main, oldMember, newMember) => {
    if (newMember.presence.status === 'offline') {
      if (!pendingUpdates[newMember.user.id]) {
        setTimeout(() => {
          main.prometheusMetrics.redisWrites.inc();

          main.redis.set(`user_last_seen:${newMember.user.id}`, pendingUpdates[newMember.user.id], 'EX', 31557600);

          delete pendingUpdates[newMember.user.id];
        }, 5000);
      }

      pendingUpdates[newMember.user.id] = moment().unix() * 1000;
    }
  },
};

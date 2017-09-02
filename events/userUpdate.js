const moment = require('moment');

module.exports = {
  fn: (main, oldUser, newUser) => {
    if (newUser.presence.status === 'offline' && !newUser.bot) {
      main.redis.set(`user_last_seen:${newUser.id}`, moment(), 'EX', 31557600);
    }
  },
};

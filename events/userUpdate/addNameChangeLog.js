const winston = require('winston');

module.exports = {
  fn: async (main, oldUser, newUser) => {
    if (oldUser.tag === newUser.tag) {
      return;
    }

    if (oldUser.username !== newUser.username && oldUser.discriminator !== newUser.discriminator) {
      winston.debug(`User ${oldUser.tag} changed tag to ${newUser.tag}`); // TODO: debounce (this gets called for every server in common

      main.prometheusMetrics.sqlWrites.inc(1);

      await main.db.name_logs.create({
        user_id: newUser.id,
        type: 3, // tag change
        before: oldUser.tag,
        after: newUser.tag,
      });
    } else if (oldUser.username !== newUser.username) {
      winston.debug(`User ${oldUser.tag} changed just the username to ${newUser.tag}`);

      main.prometheusMetrics.sqlWrites.inc(1);

      await main.db.name_logs.create({
        user_id: newUser.id,
        type: 1, // username change
        before: oldUser.username,
        after: newUser.username,
      });
    } else if (oldUser.discriminator !== newUser.discriminator) {
      winston.debug(`User ${oldUser.tag} changed just the discriminator to ${newUser.tag}`);

      main.prometheusMetrics.sqlWrites.inc(1);

      await main.db.name_logs.create({
        user_id: newUser.id,
        type: 2, // discriminator change
        before: oldUser.discriminator,
        after: newUser.discriminator,
      });
    }
  },
};

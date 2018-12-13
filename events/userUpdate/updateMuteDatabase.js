const winston = require('winston');

module.exports = {
  fn: async (main, oldUser, newUser) => {
    if (oldUser.tag === newUser.tag) {
      return;
    }

    winston.debug(`User ${oldUser.tag} changed tag to ${newUser.tag}, checking if the user has entries in the mute database...`);

    main.prometheusMetrics.sqlReads.inc();

    const isMuted = await main.db.muted_members.findOne({
      where: {
        target_id: newUser.id,
      },
    });

    if (!isMuted) {
      return;
    }

    winston.debug(`User ${newUser.tag} has entries in the mute database, updating information...`);

    main.prometheusMetrics.sqlWrites.inc();

    main.db.muted_members.update({
      target_tag: newUser.tag,
    }, {
      where: {
        target_id: newUser.id,
      },
    });
  },
};

const winston = require('winston');

module.exports = {
  fn: async (main, oldUser, newUser) => {
    if (oldUser.tag === newUser.tag) {
      return;
    }

    winston.debug(`User ${oldUser.tag} changed tag to ${newUser.tag}`);

    main.prometheusMetrics.sqlReads.inc();

    const isMuted = await main.db.muted_members.findOne({
      where: {
        target_id: newUser.id,
      },
    });

    if (!isMuted) {
      return;
    }

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

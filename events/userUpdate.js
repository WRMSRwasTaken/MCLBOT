const winston = require('winston');

module.exports = {
  debounce: true,
  fn: async (main, oldUser, newUser) => {
    if (oldUser.tag === newUser.tag) {
      return false;
    }

    return {
      key: newUser.id,
      payload: {
        userID: newUser.id,
        oldTag: oldUser.tag,
        newTag: newUser.tag,
      },
    };
  },

  debouncedFn: async (main, eventPayload) => {
    const oldTag = eventPayload.oldTag.split('#');
    const newTag = eventPayload.newTag.split('#');

    main.prometheusMetrics.sqlWrites.inc(1);

    if (oldTag[0] !== newTag[0] && oldTag[1] !== newTag[1]) { // username & discrim changed => tag change
      winston.debug(`User ${eventPayload.oldTag} changed tag to ${eventPayload.newTag}`);

      await main.db.name_logs.create({
        user_id: eventPayload.userID,
        type: 3, // tag change
        before: eventPayload.oldTag,
        after: eventPayload.newTag,
      });
    } else if (oldTag[0] === newTag[0]) { // username did not change => discrim change
      winston.debug(`User ${eventPayload.oldTag} changed just the discriminator to ${eventPayload.newTag}`);

      await main.db.name_logs.create({
        user_id: eventPayload.userID,
        type: 2, // discriminator change
        before: oldTag[1],
        after: newTag[1],
      });
    } else { // leftover is username change
      winston.debug(`User ${eventPayload.oldTag} changed just the username to ${eventPayload.newTag}`);

      await main.db.name_logs.create({
        user_id: eventPayload.userID,
        type: 1, // username change
        before: oldTag[0],
        after: newTag[0],
      });
    }

    main.prometheusMetrics.sqlReads.inc();

    const isMuted = await main.db.muted_members.findOne({
      where: {
        target_id: eventPayload.userID,
      },
    });

    if (!isMuted) {
      return;
    }

    winston.debug(`User ${eventPayload.newTag} has entries in the mute database, updating information...`);

    main.prometheusMetrics.sqlWrites.inc();

    main.db.muted_members.update({
      target_tag: eventPayload.newTag,
    }, {
      where: {
        target_id: eventPayload.userID,
      },
    });
  },
};

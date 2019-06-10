module.exports = {
  debounce: true,
  fn: (main, oldPresence, newPresence) => {
    if (newPresence.status === 'offline') {
      return {
        key: newPresence.user.id,
        payload: {
          userID: newPresence.user.id,
          lastSeen: Date.now(),
        },
      };
    }

    return false;
  },

  debouncedFn: async (main, eventPayload) => {
    main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
    main.db.user_last_seen.upsert({
      user_id: eventPayload.userID,
      last_seen: eventPayload.lastSeen,
    });
  },
};

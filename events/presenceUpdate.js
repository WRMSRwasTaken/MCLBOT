module.exports = {
  debounce: true,
  fn: (main, oldMember, newMember) => {
    if (newMember.presence.status === 'offline') {
      return {
        key: newMember.user.id,
        payload: {
          userID: newMember.user.id,
          lastSeen: Date.now(),
        },
      };
    }

    return false;
  },

  debouncedFn: async (main, eventPayload) => {
    main.prometheusMetrics.sqlWrites.inc();

    main.db.user_last_seen.upsert({
      user_id: eventPayload.userID,
      last_seen: eventPayload.lastSeen,
    });
  },
};

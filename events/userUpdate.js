module.exports = {
  fn: (main, oldUser, newUser) => {
    if (newUser.presence.status === 'offline' && !newUser.bot) {
      main.prometheusMetrics.sqlWrites.inc();

      main.db.user_last_seen.upsert({
        user_id: newUser.id,
      });
    }
  },
};

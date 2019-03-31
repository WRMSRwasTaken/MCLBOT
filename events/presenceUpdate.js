/*

This event gets triggered multiple times per user (to be exact: for every guild in common with the presence changing user),
so we need some sort of a debounce system to wait for all presence updates to finish but still just update the database once per user

 */

const pendingUpdates = {};

module.exports = {
  fn: (main, oldMember, newMember) => {
    if (newMember.presence.status === 'offline') {
      if (!pendingUpdates[newMember.user.id]) {
        setTimeout(() => {
          main.prometheusMetrics.sqlWrites.inc();

          main.db.user_last_seen.upsert({
            user_id: newMember.user.id,
            last_seen: pendingUpdates[newMember.user.id],
          });

          delete pendingUpdates[newMember.user.id];
        }, 5000);
      }

      pendingUpdates[newMember.user.id] = Date.now();
    }
  },
};

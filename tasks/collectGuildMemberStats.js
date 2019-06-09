const Bluebird = require('bluebird');

module.exports = {
  interval: 60 * 5,
  fn: async (main) => { // TODO: wait a few minutes after bot start / restart to have some more guild members cached
    for (const guild of main.api.guilds.values()) {
      await main.db.guild_member_counts.create({
        guild_id: guild.id,
        timestamp: Date.now(),
        members_online: guild.members.filter(c => c.presence && c.presence.status !== 'offline').size,
        members_total: guild.memberCount,
      });
    }
  },
};

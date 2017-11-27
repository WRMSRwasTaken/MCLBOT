class BlacklistHelper {
  constructor(main) {
    this.main = main;
  }

  // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
  async getGlobalBlacklist(user_id) {
    this.main.prometheusMetrics.sqlReads.inc();

    return this.main.db.blacklist.findOne({
      where: {
        guild_id: 0,
        channel_id: 0,
        user_id,
      },
    });
  }

  async addGlobalBlacklist(user_id) {
    this.main.prometheusMetrics.sqlWrites.inc();

    return this.main.db.blacklist.upsert({
      guild_id: 0,
      channel_id: 0,
      user_id,
    });
  }

  async removeGlobalBlacklist(user_id) {
    this.main.prometheusMetrics.sqlWrites.inc();

    return this.main.db.blacklist.destroy({
      where: {
        guild_id: 0,
        channel_id: 0,
        user_id,
      },
    });
  }

  // global server blacklist (blacklists given server id - bot admin only)
  async getGuildBlacklist(guild_id) {
    this.main.prometheusMetrics.sqlReads.inc();

    return this.main.db.blacklist.findOne({
      where: {
        guild_id,
        channel_id: 0,
        user_id: 0,
      },
    });
  }

  async addGuildBlacklist(guild_id) {
    this.main.prometheusMetrics.sqlWrites.inc();
  }

  async removeGuildBlacklist(guild_id) {
    this.main.prometheusMetrics.sqlWrites.inc();
  }

  // per-server user blacklist (blacklists given user id on the given server id - server admin only)
  async getUserBlacklist(user_id, guild_id) {
    this.main.prometheusMetrics.sqlReads.inc();

    return this.main.db.blacklist.findOne({
      where: {
        guild_id,
        channel_id: 0,
        user_id,
      },
    });
  }

  async addUserBlacklist(userID, guild_id) {
    this.main.prometheusMetrics.sqlWrites.inc();
  }

  async removeUserBlacklist(userID, guild_id) {
    this.main.prometheusMetrics.sqlWrites.inc();
  }

  // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
  async getChannelBlacklist(channel_id, guild_id) {
    this.main.prometheusMetrics.sqlReads.inc();

    return this.main.db.blacklist.findOne({
      where: {
        guild_id,
        channel_id,
        user_id: 0,
      },
    });
  }

  async addChannelBlacklist(channelID, guild_id) {
    this.main.prometheusMetrics.sqlWrites.inc();
  }

  async removeChannelBlacklist(channelID, guild_id) {
    this.main.prometheusMetrics.sqlWrites.inc();
  }
}

module.exports = BlacklistHelper;

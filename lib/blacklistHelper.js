class BlacklistHelper {
  constructor(main) {
    this.main = main;
  }

  // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
  async getGlobalBlacklist(user_id) {
    let globalResult = await this.main.cacheManager.getCache(`blacklist:global:${user_id}`);

    if (globalResult) {
      return globalResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    this.main.prometheusMetrics.sqlReads.inc();

    globalResult = await this.main.db.blacklist.findOne({
      where: {
        guild_id: 0,
        channel_id: 0,
        user_id,
      },
    });

    this.main.cacheManager.setCache(`blacklist:global:${user_id}`, !!globalResult);

    return globalResult;
  }

  async addGlobalBlacklist(user_id) {
    this.main.cacheManager.deleteCache(`blacklist:global:${user_id}`);

    this.main.prometheusMetrics.sqlWrites.inc();

    return this.main.db.blacklist.upsert({
      guild_id: 0,
      channel_id: 0,
      user_id,
    });
  }

  async removeGlobalBlacklist(user_id) {
    this.main.cacheManager.deleteCache(`blacklist:global:${user_id}`);

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
    let guildResult = await this.main.cacheManager.getCache(`blacklist:guild:${guild_id}`);

    if (guildResult) {
      return guildResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    this.main.prometheusMetrics.sqlReads.inc();

    guildResult = await this.main.db.blacklist.findOne({
      where: {
        guild_id,
        channel_id: 0,
        user_id: 0,
      },
    });

    this.main.cacheManager.setCache(`blacklist:guild:${guild_id}`, !!guildResult);

    return guildResult;
  }

  async addGuildBlacklist(guild_id) {
    this.main.cacheManager.deleteCache(`blacklist:guild:${guild_id}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  async removeGuildBlacklist(guild_id) {
    this.main.cacheManager.deleteCache(`blacklist:guild:${guild_id}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  // per-guild member blacklist (blacklists given user id on the given guild id - guild admin only)
  async getMemberBlacklist(user_id, guild_id) {
    let memberResult = await this.main.cacheManager.getCache(`blacklist:guild:${guild_id}:member:${user_id}`);

    if (memberResult) {
      return memberResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    this.main.prometheusMetrics.sqlReads.inc();

    memberResult = await this.main.db.blacklist.findOne({
      where: {
        guild_id,
        channel_id: 0,
        user_id,
      },
    });

    this.main.cacheManager.setCache(`blacklist:guild:${guild_id}:member:${user_id}`, !!memberResult);

    return memberResult;
  }

  async addUserBlacklist(user_id, guild_id) {
    this.main.cacheManager.deleteCache(`blacklist:guild:${guild_id}:member:${user_id}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  async removeUserBlacklist(user_id, guild_id) {
    this.main.cacheManager.deleteCache(`blacklist:guild:${guild_id}:member:${user_id}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
  async getChannelBlacklist(channel_id, guild_id) {
    let channelResult = await this.main.cacheManager.getCache(`blacklist:channel:${channel_id}`);

    if (channelResult) {
      return channelResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    this.main.prometheusMetrics.sqlReads.inc();

    channelResult = await this.main.db.blacklist.findOne({
      where: {
        guild_id,
        channel_id,
        user_id: 0,
      },
    });

    this.main.cacheManager.setCache(`blacklist:channel:${channel_id}`, !!channelResult);

    return channelResult;
  }

  async addChannelBlacklist(channel_id, guild_id) {
    this.main.cacheManager.deleteCache(`blacklist:channel:${channel_id}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  async removeChannelBlacklist(channel_id, guild_id) {
    this.main.cacheManager.deleteCache(`blacklist:channel:${channel_id}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }
}

module.exports = BlacklistHelper;

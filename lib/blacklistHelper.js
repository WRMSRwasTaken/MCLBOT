class BlacklistHelper {
  constructor(main) {
    this.main = main;
  }

  // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
  async getGlobalBlacklist(userID) {
    let globalResult = await this.main.cacheManager.getCache(`blacklist:global:${userID}`);

    if (globalResult) {
      return globalResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    this.main.prometheusMetrics.sqlReads.inc();

    globalResult = await this.main.db.blacklist.findOne({
      where: {
        guild_id: 0,
        channel_id: 0,
        user_id: userID,
      },
    });

    this.main.cacheManager.setCache(`blacklist:global:${userID}`, !!globalResult);

    return !!globalResult;
  }

  async addGlobalBlacklist(userID) {
    this.main.cacheManager.deleteCache(`blacklist:global:${userID}`);

    this.main.prometheusMetrics.sqlWrites.inc();

    return this.main.db.blacklist.upsert({
      guild_id: 0,
      channel_id: 0,
      user_id: userID,
    });
  }

  async removeGlobalBlacklist(userID) {
    this.main.cacheManager.deleteCache(`blacklist:global:${userID}`);

    this.main.prometheusMetrics.sqlWrites.inc();

    return this.main.db.blacklist.destroy({
      where: {
        guild_id: 0,
        channel_id: 0,
        user_id: userID,
      },
    });
  }

  // global server blacklist (blacklists given server id - bot admin only)
  async getGuildBlacklist(guildID) {
    let guildResult = await this.main.cacheManager.getCache(`blacklist:guild:${guildID}`);

    if (guildResult) {
      return guildResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    this.main.prometheusMetrics.sqlReads.inc();

    guildResult = await this.main.db.blacklist.findOne({
      where: {
        guild_id: guildID,
        channel_id: 0,
        user_id: 0,
      },
    });

    this.main.cacheManager.setCache(`blacklist:guild:${guildID}`, !!guildResult);

    return !!guildResult;
  }

  async addGuildBlacklist(guildID) {
    this.main.cacheManager.deleteCache(`blacklist:guild:${guildID}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  async removeGuildBlacklist(guildID) {
    this.main.cacheManager.deleteCache(`blacklist:guild:${guildID}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  // per-guild member blacklist (blacklists given user id on the given guild id - guild admin only)
  async getMemberBlacklist(userID, guildID) {
    let memberResult = await this.main.cacheManager.getCache(`blacklist:guild:${guildID}:member:${userID}`);

    if (memberResult) {
      return memberResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    this.main.prometheusMetrics.sqlReads.inc();

    memberResult = await this.main.db.blacklist.findOne({
      where: {
        guild_id: guildID,
        channel_id: 0,
        user_id: userID,
      },
    });

    this.main.cacheManager.setCache(`blacklist:guild:${guildID}:member:${userID}`, !!memberResult);

    return !!memberResult;
  }

  async addUserBlacklist(userID, guildID) {
    this.main.cacheManager.deleteCache(`blacklist:guild:${guildID}:member:${userID}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  async removeUserBlacklist(userID, guildID) {
    this.main.cacheManager.deleteCache(`blacklist:guild:${guildID}:member:${userID}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
  async getChannelBlacklist(channelID, guildID) {
    let channelResult = await this.main.cacheManager.getCache(`blacklist:channel:${channelID}`);

    if (channelResult) {
      return channelResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    this.main.prometheusMetrics.sqlReads.inc();

    channelResult = await this.main.db.blacklist.findOne({
      where: {
        guild_id: guildID,
        channel_id: channelID,
        user_id: 0,
      },
    });

    this.main.cacheManager.setCache(`blacklist:channel:${channelID}`, !!channelResult);

    return !!channelResult;
  }

  async addChannelBlacklist(channelID, guildID) {
    this.main.cacheManager.deleteCache(`blacklist:channel:${channelID}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }

  async removeChannelBlacklist(channelID, guildID) {
    this.main.cacheManager.deleteCache(`blacklist:channel:${channelID}`);

    this.main.prometheusMetrics.sqlWrites.inc();
  }
}

module.exports = BlacklistHelper;

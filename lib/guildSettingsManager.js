class GuildSettingsManager {
  constructor(main) {
    this.main = main;
  }

  async getGuildSetting(guildID, key) {
    let guildSetting = await this.main.cacheManager.getCache(`guild_setting:${guildID}:${key}`);

    if (guildSetting) {
      return guildSetting;
    }

    if (guildSetting === '') {
      return null;
    }

    this.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const dbResult = await this.main.db.guild_settings.findOne({
      where: {
        guild_id: guildID,
        key,
      },
    });

    if (dbResult) {
      guildSetting = dbResult.value;

      this.main.cacheManager.setCache(`guild_setting:${guildID}:${key}`, guildSetting);

      return guildSetting;
    }

    this.main.cacheManager.setCache(`guild_setting:${guildID}:${key}`, '');

    return null;
  }

  async setGuildSetting(guildID, key, value) {
    this.main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
    await this.main.db.guild_settings.upsert({
      guild_id: guildID,
      key,
      value,
    });

    return this.main.cacheManager.deleteCache(`guild_setting:${guildID}:${key}`); // TODO: update the cache instead of purging it?
  }

  async deleteGuildSetting(guildID, key) {
    this.main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
    await this.main.db.guild_settings.destroy({
      where: {
        guild_id: guildID,
        key,
      },
    });

    return this.main.cacheManager.deleteCache(`guild_setting:${guildID}:${key}`);
  }
}

module.exports = GuildSettingsManager;

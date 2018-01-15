const winston = require('winston');

class GuildSettingsManager {
  constructor(main) {
    this.main = main;
  }

  async getGuildSetting(guildID, key) {
    winston.debug('Getting value for guild setting %s from cache...', key);

    let guildSetting = await this.main.cacheManager.getCache(`guild_setting:${guildID}:${key}`);

    if (guildSetting) {
      winston.debug('Value for guild setting %s in cache is: %s', key, guildSetting);

      return guildSetting;
    }

    if (guildSetting === '') {
      winston.debug('Cache returned an empty value for guild setting %s which means that there is no database record', key);

      return null;
    }

    winston.debug('Value for guild setting %s is not in the cache, going to query the database...', key);

    const dbResult = await this.main.db.guild_settings.findOne({
      where: {
        guild_id: guildID,
        key,
      },
    });

    this.main.prometheusMetrics.sqlReads.inc();

    if (dbResult) {
      guildSetting = dbResult.value;

      winston.debug('The value for guild setting %s in the database is: %s', key, guildSetting);

      this.main.cacheManager.setCache(`guild_setting:${guildID}:${key}`, guildSetting);

      return guildSetting;
    }

    winston.debug('No value for guild setting %s in the database.', key);

    this.main.cacheManager.setCache(`guild_setting:${guildID}:${key}`, '');

    return null;
  }

  async setGuildSetting(guildID, key, value) {
    this.main.prometheusMetrics.sqlWrites.inc();

    await this.main.db.guild_settings.upsert({
      guild_id: guildID,
      key,
      value,
    });

    return this.main.cacheManager.deleteCache(`guild_setting:${guildID}:${key}`);
  }

  async deleteGuildSetting(guildID, key) {
    this.main.prometheusMetrics.sqlWrites.inc();

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

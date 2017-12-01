const nconf = require('nconf');

class PrefixHelper {
  constructor(main) {
    this.main = main;
  }

  getDefaultPrefix() {
    return nconf.get('bot:prefix');
  }

  async getGuildPrefixFromDB(guild_id) {
    this.main.prometheusMetrics.sqlReads.inc();

    return this.main.db.guild_prefix.findOne({
      where: {
        guild_id,
      },
    });
  }

  async getGuildPrefix(guildID) {
    let guildPrefix = await this.main.cacheManager.getCache(`guild_prefix:${guildID}`);

    if (guildPrefix) {
      return guildPrefix;
    }

    const dbResult = await this.getGuildPrefixFromDB(guildID);

    if (dbResult) {
      guildPrefix = dbResult.prefix;
    } else {
      guildPrefix = this.getDefaultPrefix();
    }

    this.main.cacheManager.setCache(`guild_prefix:${guildID}`, guildPrefix);

    return guildPrefix;
  }

  async setGuildPrefix(guild_id, prefix) {
    this.main.cacheManager.deleteCache(`guild_prefix:${guild_id}`);

    this.main.prometheusMetrics.sqlWrites.inc();

    this.main.db.guild_prefix.upsert({
      guild_id,
      prefix,
    });
  }

  async deleteGuildPrefix(guild_id) {
    this.main.cacheManager.deleteCache(`guild_prefix:${guild_id}`);

    this.main.prometheusMetrics.sqlWrites.inc();

    return this.main.db.guild_prefix.destroy({
      where: {
        guild_id,
      },
    });
  }
}

module.exports = PrefixHelper;

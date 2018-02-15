const nconf = require('nconf');

class PrefixHelper {
  constructor(main) {
    this.main = main;
  }

  getDefaultPrefix() {
    return nconf.get('bot:prefix');
  }

  async getGuildPrefix(guildID) {
    const guildPrefix = await this.main.guildSettingsManager.getGuildSetting(guildID, 'prefix');

    if (guildPrefix) {
      return guildPrefix;
    }

    return this.getDefaultPrefix();
  }

  async setGuildPrefix(guildID, prefix) {
    return this.main.guildSettingsManager.setGuildSetting(guildID, 'prefix', prefix);
  }

  async deleteGuildPrefix(guildID) {
    return this.main.guildSettingsManager.deleteGuildSetting(guildID, 'prefix');
  }

  async isGuildPrefixDisabled(guildID) {
    return this.main.guildSettingsManager.getGuildSetting(guildID, 'disablePrefix');
  }

  async enableGuildPrefix(guildID) {
    return this.main.guildSettingsManager.deleteGuildSetting(guildID, 'disablePrefix');
  }

  async disableGuildPrefix(guildID) {
    return this.main.guildSettingsManager.setGuildSetting(guildID, 'disablePrefix', 'true');
  }
}

module.exports = PrefixHelper;

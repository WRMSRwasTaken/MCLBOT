const nconf = require('nconf');

class PrefixHelper {
  constructor(main) {
    this.main = main;

    this.prefixKeyName = 'prefix';
    this.disablePrefixKeyName = 'disablePrefix';
  }

  getDefaultPrefix() {
    return nconf.get('bot:prefix');
  }

  async getGuildPrefix(guildID) {
    const guildPrefix = await this.main.guildSettingsManager.getGuildSetting(guildID, this.prefixKeyName);

    if (guildPrefix) {
      return guildPrefix;
    }

    return this.getDefaultPrefix();
  }

  async setGuildPrefix(guildID, prefix) {
    return this.main.guildSettingsManager.setGuildSetting(guildID, this.prefixKeyName, prefix);
  }

  async deleteGuildPrefix(guildID) {
    return this.main.guildSettingsManager.deleteGuildSetting(guildID, this.prefixKeyName);
  }

  async isGuildPrefixDisabled(guildID) {
    return this.main.guildSettingsManager.getGuildSetting(guildID, this.disablePrefixKeyName);
  }

  async enableGuildPrefix(guildID) {
    return this.main.guildSettingsManager.deleteGuildSetting(guildID, this.disablePrefixKeyName);
  }

  async disableGuildPrefix(guildID) {
    return this.main.guildSettingsManager.setGuildSetting(guildID, this.disablePrefixKeyName, 'true');
  }
}

module.exports = PrefixHelper;

import nconf from 'nconf';

import {MCLBOTMain, MCLBOTModule} from "../definitions.js";

export default class PrefixHelper implements MCLBOTModule {
  private main = {} as MCLBOTMain;
  private prefixKeyName: string;
  private disablePrefixKeyName: string;

  constructor(main: MCLBOTMain) {
    this.main = main;

    this.prefixKeyName = 'prefix';
    this.disablePrefixKeyName = 'disablePrefix';
  }

  initializeModule() {
    return;
  }

  getDefaultPrefix() {
    return nconf.get('bot:prefix');
  }

  async getGuildPrefix(guildID: string) {
    const guildPrefix = await this.main.modules.guildSettingsManager.getGuildSetting(guildID, this.prefixKeyName);

    if (guildPrefix) {
      return guildPrefix;
    }

    return this.getDefaultPrefix();
  }

  async setGuildPrefix(guildID: string, prefix: string) {
    return this.main.modules.guildSettingsManager.setGuildSetting(guildID, this.prefixKeyName, prefix);
  }

  async deleteGuildPrefix(guildID: string) {
    return this.main.modules.guildSettingsManager.deleteGuildSetting(guildID, this.prefixKeyName);
  }

  async isGuildPrefixDisabled(guildID: string) {
    return this.main.modules.guildSettingsManager.getGuildSetting(guildID, this.disablePrefixKeyName);
  }

  async enableGuildPrefix(guildID: string) {
    return this.main.modules.guildSettingsManager.deleteGuildSetting(guildID, this.disablePrefixKeyName);
  }

  async disableGuildPrefix(guildID: string) {
    return this.main.modules.guildSettingsManager.setGuildSetting(guildID, this.disablePrefixKeyName, 'true');
  }
}

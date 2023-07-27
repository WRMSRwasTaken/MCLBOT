import {MCLBOTMain, MCLBOTModule} from "../definitions.js";

export default class GuildSettingsManager implements MCLBOTModule {
  private main = {} as MCLBOTMain;

  constructor(main: MCLBOTMain) {
    this.main = main;
  }

  initializeModule() {
    return;
  }

  async getGuildSetting(guildID: string, key: string) {
    let guildSetting = await this.main.modules.cacheManager.getCache(`guild_setting:${guildID}:${key}`);

    if (guildSetting) {
      return guildSetting;
    }

    if (guildSetting === '') {
      return null;
    }

    // this.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const sqlResult = await this.main.pg`SELECT * from guild_settings WHERE guild_id = ${guildID} AND key = ${key} LIMIT 1`;

    if (sqlResult.length > 0 && sqlResult[0]) {
      guildSetting = sqlResult[0]['key'];

      this.main.modules.cacheManager.setCache(`guild_setting:${guildID}:${key}`, `${guildSetting}`);

      return guildSetting;
    }

    this.main.modules.cacheManager.setCache(`guild_setting:${guildID}:${key}`, '');

    return null;
  }

  async setGuildSetting(guildID: string, key: string, value: string) {
    // this.main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
    await this.main.pg`INSERT INTO guild_settings (guild_id, key, value, created_at, updated_at) VALUES (${guildID}, ${key}, ${value}, NOW(), NOW()) ON CONFLICT DO UPDATE SET updated_at = NOW()`;

    return this.main.modules.cacheManager.deleteCache(`guild_setting:${guildID}:${key}`); // TODO: update the cache instead of purging it?
  }

  async deleteGuildSetting(guildID: string, key: string) {
    // this.main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
    await this.main.pg`DELETE FROM guild_settings WHERE guild_id = ${guildID} AND key = ${key}`;

    return this.main.modules.cacheManager.deleteCache(`guild_setting:${guildID}:${key}`);
  }
}

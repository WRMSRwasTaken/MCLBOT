import {MCLBOTMain, MCLBOTModule} from '../definitions.js';

export default class BlacklistHelper implements MCLBOTModule {
  private main = {} as MCLBOTMain;
  constructor(main: MCLBOTMain) {
    this.main = main;
  }

  initializeModule() {
    return;
  }

  // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
  async getGlobalBlacklist(userID: string): Promise<boolean> {
    const cacheResult = await this.main.modules['cacheManager'].getCache(`blacklist:global:${userID}`);

    if (cacheResult) {
      return cacheResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    // this.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const sqlResult = await this.main.pg`SELECT * FROM blacklist where guild_id = 0 and channel_id = 0 and user_id = ${userID}`;
    const endResult = sqlResult.length > 0;

    this.main.modules.cacheManager.setCache(`blacklist:global:${userID}`, `${endResult}`);

    return endResult;
  }

  async addGlobalBlacklist(userID: string) {
    this.main.modules.cacheManager.deleteCache(`blacklist:global:${userID}`);

    // this.main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
    return !!this.main.pg`INSERT INTO blacklist (guild_id, channel_id, user_id, created_at) VALUES (0, 0, ${userID}, NOW()) ON CONFLICT DO UPDATE SET created_at = NOW()`;
  }

  async removeGlobalBlacklist(userID: string) {
    this.main.modules.cacheManager.deleteCache(`blacklist:global:${userID}`);

    // this.main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
    return !!this.main.pg`DELETE FROM blacklist WHERE guild_id = 0 AND channel_id = 0 AND user_id = ${userID}`;
  }

  // global server blacklist (blacklists given server id - bot admin only)
  async getGuildBlacklist(guildID: string) {
    const cacheResult = await this.main.modules.cacheManager.getCache(`blacklist:guild:${guildID}`);

    if (cacheResult) {
      return cacheResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    // this.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const sqlResult = await this.main.pg`SELECT * from blacklist WHERE guild_id = ${guildID} AND channel_id = 0 AND user_id = 0 LIMIT 1`;
    const endResult = sqlResult.length > 0;

    this.main.modules.cacheManager.setCache(`blacklist:guild:${guildID}`, `${endResult}`);

    return endResult;
  }

  async addGuildBlacklist(guildID: string) {
    this.main.modules.cacheManager.deleteCache(`blacklist:guild:${guildID}`);
  }

  async removeGuildBlacklist(guildID: string) {
    this.main.modules.cacheManager.deleteCache(`blacklist:guild:${guildID}`);
  }

  // per-guild member blacklist (blacklists given user id on the given guild id - guild admin only)
  async getMemberBlacklist(userID: string, guildID: string) {
    const cacheResult = await this.main.modules.cacheManager.getCache(`blacklist:guild:${guildID}:member:${userID}`);

    if (cacheResult) {
      return cacheResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    // this.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const sqlResult = await this.main.pg`SELECT * FROM blacklist WHERE guild_id = ${guildID} AND channel_id = 0 AND user_id = ${userID} LIMIT 1`;
    const endResult = sqlResult.length > 0;

    this.main.modules.cacheManager.setCache(`blacklist:guild:${guildID}:member:${userID}`, `${endResult}`);

    return endResult;
  }

  async addUserBlacklist(userID: string, guildID: string) {
    this.main.modules.cacheManager.deleteCache(`blacklist:guild:${guildID}:member:${userID}`);
  }

  async removeUserBlacklist(userID: string, guildID: string) {
    this.main.modules.cacheManager.deleteCache(`blacklist:guild:${guildID}:member:${userID}`);
  }

  // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
  async getChannelBlacklist(channelID: string, guildID: string) {
    const cacheResult = await this.main.modules.cacheManager.getCache(`blacklist:channel:${channelID}`);

    if (cacheResult) {
      return cacheResult === 'true'; // Redis returns everything as a string, so convert it to bool
    }

    // this.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const sqlResult = await this.main.pg`SELECT * FROM blacklist WHERE guild_id = ${guildID} AND channel_id = ${channelID} AND user_id = 0`;
    const endResult = sqlResult.length > 0;

    this.main.modules.cacheManager.setCache(`blacklist:channel:${channelID}`, `${endResult}`);

    return endResult;
  }

  async addChannelBlacklist(channelID: string, guildID: string) {
    console.log(guildID);
    this.main.modules.cacheManager.deleteCache(`blacklist:channel:${channelID}`);
  }

  async removeChannelBlacklist(channelID: string, guildID: string) {
    console.log(guildID);
    this.main.modules.cacheManager.deleteCache(`blacklist:channel:${channelID}`);
  }
}

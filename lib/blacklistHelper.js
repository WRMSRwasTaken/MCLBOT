class BlacklistHelper {
  constructor(main) {
    this.main = main;
  }

  // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
  async getGlobalBlacklist(userID) {
    this.main.prometheusMetrics.sqlReads.inc();

    return this.main.db.blacklist.findOne({
      where: {
        server_id: 0,
        channel_id: 0,
        user_id: userID,
      },
    });
  }

  async addGlobalBlacklist(userID) {
    return this.main.db.blacklist.upsert({
      server_id: 0,
      channel_id: 0,
      user_id: userID,
    });
  }

  async removeGlobalBlacklist(userID) {
    return this.main.db.blacklist.destroy({
      where: {
        server_id: 0,
        channel_id: 0,
        user_id: userID,
      },
    });
  }

  // global server blacklist (blacklists given server id - bot admin only)
  async getServerBlacklist(serverID) {

  }

  async addServerBlacklist(serverID) {

  }

  async removeServerBlacklist(serverID) {

  }

  // per-server user blacklist (blacklists given user id on the given server id - server admin only)
  async getUserBlacklist(userID, serverID) {
    this.main.prometheusMetrics.sqlReads.inc();

    return this.main.db.blacklist.findOne({
      where: {
        server_id: serverID,
        channel_id: 0,
        user_id: userID,
      },
    });
  }

  async addUserBlacklist(userID, serverID) {

  }

  async removeUserBlacklist(userID, serverID) {

  }

  // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
  async getChannelBlacklist(channelID, serverID) {
    this.main.prometheusMetrics.sqlReads.inc();

    return this.main.db.blacklist.findOne({
      where: {
        server_id: serverID,
        channel_id: channelID,
        user_id: 0,
      },
    });
  }

  async addChannelBlacklist(channelID, serverID) {

  }

  async removeChannelBlacklist(channelID, serverID) {

  }
}

module.exports = BlacklistHelper;

const nconf = require('nconf');

class PrefixHelper {
  constructor(main) {
    this.main = main;
  }

  getDefaultPrefix() {
    return nconf.get('bot:prefix');
  }

  async getServerPrefixFromDB(serverID) {
    this.main.prometheusMetrics.sqlReads.inc();

    return this.main.db.server_prefix.findOne({
      where: {
        server_id: serverID,
      },
    });
  }

  async getServerPrefix(serverID) {
    const dbResult = await this.getServerPrefixFromDB(serverID);

    let serverPrefix;

    if (dbResult) {
      serverPrefix = dbResult.prefix;
    } else {
      serverPrefix = this.getDefaultPrefix();
    }

    return serverPrefix;
  }

  async setServerPrefix(serverID, prefix) {
    this.main.prometheusMetrics.sqlWrites.inc();

    return this.main.db.server_prefix.upsert({
      server_id: serverID,
      prefix,
    });
  }

  async deleteServerPrefix(serverID) {
    this.main.prometheusMetrics.sqlWrites.inc();

    return this.main.db.server_prefix.destroy({
      where: {
        server_id: serverID,
      },
    });
  }
}

module.exports = PrefixHelper;

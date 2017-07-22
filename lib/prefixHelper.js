const nconf = require('nconf');

class PrefixHelper {
  constructor(main) {
    this.main = main;
  }

  getDefaultPrefix() {
    return nconf.get('bot:prefix');
  }

  async getServerPrefixFromDB(id) {
    return this.main.db.ServerPrefix.findById(id);
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

  async setServerPrefix(id, prefix) {
    return this.main.db.ServerPrefix.upsert({
      id,
      prefix,
    });
  }

  async deleteServerPrefix(id) {
    return this.main.db.ServerPrefix.destroy({
      where: {
        id,
      },
    });
  }
}

module.exports = PrefixHelper;

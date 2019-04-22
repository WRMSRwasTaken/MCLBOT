/*

This class is intended to sort of debounce events emitted by the discord gateway with the same payload over all bot shards, for example
the presenceUpdate event gets triggered multiple times per user (to be exact: for every guild in common with the presence changing user)
or the userUpdate event gets triggered for every shard the bot sees that user which would case a high load on the database, so we need to
"collect" those events and handle them asynchronously later on

 */

class UserHelper {
  constructor(main) {
    this.main = main;
  }

  async addEvent(eventName, key, eventPayload) {
    return this.main.redis.set(`eventdebounce:${eventName}:${key}`, JSON.stringify(eventPayload));
  }

}

module.exports = UserHelper;

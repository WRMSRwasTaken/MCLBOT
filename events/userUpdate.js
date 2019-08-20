const winston = require('winston');

const pendingUpdates = {};
const pendingUpdatesData = {};

async function insertSQL(main, data) {
  const oldTag = data.oldTag.split('#');
  const newTag = data.newTag.split('#');

  main.prometheusMetrics.sqlCommands.labels('INSERT').inc();
  if (oldTag[0] !== newTag[0] && oldTag[1] !== newTag[1]) { // username & discrim changed => tag change
    winston.debug(`User ${data.oldTag} changed tag to ${data.newTag}`);

    await main.db.name_logs.create({
      user_id: data.userID,
      type: 'TAG',
      before: data.oldTag,
      after: data.newTag,
      timestamp: data.timestamp,
    });
  } else if (oldTag[0] === newTag[0]) { // username did not change => discrim change
    winston.debug(`User ${data.oldTag} changed just the discriminator to ${data.newTag}`);

    await main.db.name_logs.create({
      user_id: data.userID,
      type: 'DISCRIMINATOR',
      before: oldTag[1],
      after: newTag[1],
      timestamp: data.timestamp,
    });
  } else { // leftover is username change
    winston.debug(`User ${data.oldTag} changed just the username to ${data.newTag}`);

    await main.db.name_logs.create({
      user_id: data.userID,
      type: 'USERNAME',
      before: oldTag[0],
      after: newTag[0],
      timestamp: data.timestamp,
    });
  }

  main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
  const isMuted = await main.db.muted_members.findOne({
    where: {
      target_id: data.userID,
    },
  });

  if (!isMuted) {
    return;
  }

  winston.debug(`User ${data.newTag} has entries in the mute database, updating information...`);

  main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
  main.db.muted_members.update({
    target_tag: data.newTag,
  }, {
    where: {
      target_id: data.userID,
    },
  });
}

async function handleQueue(main, userID) {
  let lastHash = '';
  let eventEntry;

  winston.debug(`Handling queued userUpdate event for user ID ${userID}`);

  while (eventEntry = pendingUpdatesData[userID].shift()) { // eslint-disable-line no-cond-assign
    if (lastHash !== `${eventEntry.oldTag}${eventEntry.newTag}`) {
      try {
        await insertSQL(main, eventEntry);
      } catch (ex) {
        // huh?
      }

      lastHash = `${eventEntry.oldTag}${eventEntry.newTag}`;
    }
  }

  delete pendingUpdates[userID];

  if (pendingUpdatesData[userID].length === 0) {
    winston.debug(`No more pending data for userUpdate event of user ID ${userID}`);

    delete pendingUpdatesData[userID];
  }
}

module.exports = { // TODO: this isn't shard aware, we're going to broadcast those events via rpc and let shard 0 handle them
  fn: async (main, oldUser, newUser) => {
    if (oldUser.tag === newUser.tag) {
      return;
    }

    if (newUser.bot) {
      return;
    }

    if (!pendingUpdatesData[newUser.id]) {
      pendingUpdatesData[newUser.id] = [];
    }

    winston.debug(`Queuing data for userUpdate event for user ID ${newUser.id}`);

    pendingUpdatesData[newUser.id].push({
      userID: newUser.id,
      oldTag: oldUser.tag,
      newTag: newUser.tag,
      timestamp: Date.now(),
    });

    if (pendingUpdates[newUser.id]) {
      winston.debug(`Deleting timer for userUpdate event for user ID ${newUser.id}`);

      clearTimeout(pendingUpdates[newUser.id]);
    }

    winston.debug(`Starting timer for userUpdate event for user ID ${newUser.id}`);

    pendingUpdates[newUser.id] = setTimeout(handleQueue.bind(this, main, newUser.id), 10000);
  },
};

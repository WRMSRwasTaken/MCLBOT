const nconf = require('nconf');

module.exports = {
  fn: (main, messageReaction, user) => {
    main.paginationHelper.handleMessageReactionAddEvent(messageReaction, user);

    if (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false') {
      if (messageReaction.emoji.name === '❌' && user.id === nconf.get('bot:owner') && messageReaction.message.deletable) {
        messageReaction.message.delete();
      }
    }
  },
};

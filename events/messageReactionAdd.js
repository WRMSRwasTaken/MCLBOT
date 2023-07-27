const nconf = require('nconf');

module.exports = {
  fn: (main, messageReaction, user) => {
    main.paginationHelper.handleMessageReactionAddEvent(messageReaction, user);

    if (messageReaction.emoji.name === '❌' && user.id === nconf.get('bot:owner') && messageReaction.message.deletable) {
      messageReaction.message.delete();
    }
  },
};

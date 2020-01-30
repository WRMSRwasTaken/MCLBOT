const nconf = require('nconf');

module.exports = {
  fn: (main, MessageReactionAdd) => {
    main.paginationHelper.handleMessageReactionAddEvent(MessageReactionAdd.reaction, MessageReactionAdd.user);

    if (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false') {
      if (MessageReactionAdd.reaction.emoji.name === '❌' && MessageReactionAdd.user.id === nconf.get('bot:owner') && MessageReactionAdd.message.canDelete) {
        MessageReactionAdd.reaction.delete();
      }
    }
  },
};

module.exports = {
  messageReactionAdd: {
    on: 'messageReactionAdd',
    fn: (main, messageReaction, user) => main.paginationHelper.handleMessageReactionAddEvent(messageReaction, user),
  },

  messageReactionRemove: {
    on: 'messageReactionRemove',
    fn: (main, messageReaction, user) => main.paginationHelper.handleMessageReactionRemoveEvent(messageReaction, user),
  },
};

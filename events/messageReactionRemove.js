module.exports = {
  fn: (main, MessageReactionAdd) => main.paginationHelper.handleMessageReactionRemoveEvent(MessageReactionAdd.reaction, MessageReactionAdd.user),
};

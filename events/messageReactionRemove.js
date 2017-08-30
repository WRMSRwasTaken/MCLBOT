module.exports = {
  fn: (main, messageReaction, user) => {
    main.paginationHelper.handleMessageReactionRemoveEvent(messageReaction, user);
  },
};

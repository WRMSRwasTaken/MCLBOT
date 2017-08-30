module.exports = {
  fn: (main, messageReaction, user) => {
    main.paginationHelper.handleMessageReactionAddEvent(messageReaction, user);
  },
};

module.exports = {
  fn: (main, messageReaction, user) => {
    main.paginationHelper.handleMessageReactionAddEvent(messageReaction, user);

    if (messageReaction.emoji.name === '❌' && main.owner.includes(user.id) && messageReaction.message.deletable) {
      messageReaction.message.delete();
    }
  },
};

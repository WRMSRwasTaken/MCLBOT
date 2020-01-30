module.exports = {
  fn: (main, MessageUpdate) => {
    if (MessageUpdate.isEmbedUpdate) {
      return;
    }

    main.commandHandler.handleMessageEvent(MessageUpdate.message, true);
  },
};

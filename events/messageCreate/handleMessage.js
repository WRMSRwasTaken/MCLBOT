module.exports = {
  fn: (main, MessageCreate) => main.commandHandler.handleMessageEvent(MessageCreate.message),
};

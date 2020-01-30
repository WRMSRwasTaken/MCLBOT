module.exports = {
  fn: (main, MessageDelete) => main.commandHandler.handleMessageDeleteEvent(MessageDelete.message),
};

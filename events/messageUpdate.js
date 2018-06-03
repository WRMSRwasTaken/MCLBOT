module.exports = {
  fn: (main, oldMessage, newMessage) => main.commandHandler.handleMessageEvent(oldMessage, newMessage),
};

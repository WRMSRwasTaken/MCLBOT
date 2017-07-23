module.exports = {

  message: {
    on: 'message',
    fn: (main, message) => main.commandHandler.handleMessageEvent(message),
  },

  messageUpdate: {
    on: 'messageUpdate',
    fn: (main, oldMessage, newMessage) => main.commandHandler.handleMessageUpdateEvent(oldMessage, newMessage),
  },

  messageDelete: {
    on: 'messageDelete',
    fn: async (main, message) => main.commandHandler.handleMessageDeleteEvent(message),
  },
};

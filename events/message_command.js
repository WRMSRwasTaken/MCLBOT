const winston = require('winston');

module.exports = {

  message: {
    on: 'message',
    fn: async (main, message) => {
      const shouldHandle = await main.utils.shouldHandle(message);

      winston.debug('New message event fired. ID: %s - shouldHandle? %s -- %s', message.id, shouldHandle, message.content);

      if (shouldHandle) {
        main.commandHandler.handleMessage(message);
      }
    },
  },

  messageUpdate: {
    on: 'messageUpdate',
    fn: async (main, oldMessage, newMessage) => {
      const shouldHandle = await main.utils.shouldHandle(newMessage);

      winston.debug('Message edit event fired. ID: %s - hasReplies? %s - shouldHandle (new message)? %s -- %s <-> %s', newMessage.id, !!oldMessage.replies, shouldHandle, oldMessage.content, newMessage.content);

      if (!oldMessage.content || !newMessage.content || oldMessage.content === newMessage.content) {
        winston.debug('Message content did not change... returning');
        return;
      }

      if (oldMessage.responded) {
        if (shouldHandle) {
          if (oldMessage.replies.length === 1) {
            winston.debug('Editing old response...');
            main.commandHandler.handleMessage(newMessage, oldMessage.replies[0]);
            return;
          } else if (oldMessage.replies.length > 1) {
            winston.debug('Deleting old responses and sending new messages...');

            for (const msg of oldMessage.replies) {
              if (msg.deletable) {
                msg.delete(0);
              }
            }

            newMessage.replies = [];
          } else {
            winston.debug('Message has no responses so far...');
          }

          main.commandHandler.handleMessage(newMessage);
          return;
        }

        winston.debug('Deleting all answers...');

        for (const msg of oldMessage.replies) {
          if (msg.deletable) {
            msg.delete(0);
          }
        }

        newMessage.replies = [];
        newMessage.responded = false;

        return;
      }

      if (shouldHandle) {
        main.commandHandler.handleMessage(newMessage);
      }
    },
  },

  messageDelete: {
    on: 'messageDelete',
    fn: async (main, message) => {
      winston.debug('Message delete event fired. was answered by me?', message.responded);
      if (!message.responded) {
        return;
      }

      winston.debug('Has replies from me?', (message.replies && message.replies.count > 0));
      if (!message.replies) {
        return;
      }

      message.wasDeleted = true;

      for (const msg of message.replies) {
        if (msg.deletable) {
          msg.delete(0);
        }
      }

      message.replies = [];
    },
  },
};

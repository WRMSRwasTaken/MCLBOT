const winston = require('winston');

module.exports = ((main) => {
  const events = {};

  events.message = {
    on: 'message',
    fn: (message) => {
      winston.debug('New message event fired. ID: %s - isMyMessage? %s - shouldAnswer? %s -- %s', message.id, main.isMyMessage(message), main.shouldAnswer(message), message.content);

      if (main.shouldAnswer(message)) {
        winston.debug('Responding to message...');
        main.handleMessage(message);
      }
    },
  };

  events.messageUpdate = {
    on: 'messageUpdate',
    fn: (oldMessage, newMessage) => {
      winston.debug('Message edit event fired. ID: %s - hasReplies? %s - isMyMessage? %s - shouldAnswer? %s -- %s <-> %s', newMessage.id, !!oldMessage.replies, main.isMyMessage(newMessage), main.shouldAnswer(newMessage), oldMessage.content, newMessage.content);

      if (!oldMessage.content || !newMessage.content || oldMessage.content === newMessage.content) {
        winston.debug('Message content did not change...');
        return;
      }

      if (oldMessage.responded) {
        if (main.shouldAnswer(newMessage)) {
          if (oldMessage.replies.length === 1) {
            winston.debug('Editing old response...');
            main.handleMessage(newMessage, oldMessage.replies[0]);
            return;
          }

          winston.debug('Deleting old responses and sending new messages...');

          for (const msg of oldMessage.replies) {
            if (msg.deletable) {
              msg.delete(0);
            }
          }

          newMessage.replies = [];

          main.handleMessage(newMessage);
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

      if (main.shouldAnswer(newMessage)) {
        winston.debug('Responding to it...');
        main.handleMessage(newMessage);
      }
    },
  };

  events.messageDelete = {
    on: 'messageDelete',
    fn: (message) => {
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
  };

  return events;
});

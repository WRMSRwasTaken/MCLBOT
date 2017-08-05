const winston = require('winston');
const EventEmitter = require('events');

class PaginationHelper {
  constructor(main) {
    this.main = main;
  }

  handleMessageReactionAddEvent(messageReaction, user) {
    if (user.bot || !messageReaction.message.pagination || messageReaction.message.pagination.invokerUserID !== user.id) {
      return;
    }

    winston.debug('Message reaction add event fired. Added emoji %s', messageReaction.emoji);

    if (messageReaction.emoji.name === '⏮') {
      console.log('asd');
    }
    // console.log(messageReaction.emoji.name);
    // console.log('⏮');


    messageReaction.message.pagination.eventEmitter.emit('test');
  }

  handleMessageReactionRemoveEvent(messageReaction, user) {
    if (user.bot || !messageReaction.message.pagination || messageReaction.message.pagination.invokerUserID !== user.id) {
      return;
    }

    if (messageReaction.message.guild && messageReaction.message.channel.permissionsFor(messageReaction.message.guild.me).has('MANAGE_MESSAGES')) {
      return; // We're going to remove the user's reaction for ourselve if we have the permission for it, if not handle the user's reaction remove as 'next click'
    }

    winston.debug('Message reaction remove event fired. Removed emoji %s', messageReaction.emoji.identifier);
  }

  async initPagination(message, invoker) {
    if (message.guild && !message.channel.permissionsFor(message.guild.me).has('ADD_REACTIONS')) {
      return false;
    }

    winston.debug('Initializing pagination on message ID: %s', message.id);

    message.pagination = {};
    message.pagination.invokerUserID = invoker.id;

    winston.debug('Adding reactions...');

    await message.react('⏮');
    await message.react('◀');
    await message.react('▶');
    await message.react('⏭');

    winston.debug('Registering event handler...');

    const eventEmitter = new EventEmitter();
    message.pagination.eventEmitter = eventEmitter;
    return eventEmitter;
  }
}

module.exports = PaginationHelper;

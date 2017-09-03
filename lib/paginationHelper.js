const winston = require('winston');
const EventEmitter = require('events');

class PaginationHelper {
  constructor(main) {
    this.main = main;
  }

  async handleMessageReactionAddEvent(messageReaction, user) {
    if (user.bot || !messageReaction.message.pagination || messageReaction.message.pagination.invokerUserID !== user.id) {
      return;
    }

    winston.debug('Message reaction add event fired. Added emoji %s', messageReaction.emoji.name);

    if (messageReaction.message.guild && messageReaction.message.channel.permissionsFor(messageReaction.message.guild.me).has('MANAGE_MESSAGES') && ['⏮', '◀', '▶', '⏭'].includes(messageReaction.emoji.name)) {
      await messageReaction.remove(user);
    }

    this.handlePaginationClick(messageReaction);
  }

  handleMessageReactionRemoveEvent(messageReaction, user) {
    if (user.bot || !messageReaction.message.pagination || messageReaction.message.pagination.invokerUserID !== user.id) {
      return;
    }

    if (messageReaction.message.guild && messageReaction.message.channel.permissionsFor(messageReaction.message.guild.me).has('MANAGE_MESSAGES')) {
      return; // We're going to remove the user's reaction for ourselve if we have the permission for it, if not handle the user's reaction remove as 'next click'
    }

    winston.debug('Message reaction remove event fired. Removed emoji %s', messageReaction.emoji.name);

    this.handlePaginationClick(messageReaction);
  }

  handlePaginationClick(messageReaction) {
    switch (messageReaction.emoji.name) {
      case '⏮':
        this.paginateFirst(messageReaction.message.pagination);
        break;
      case '◀':
        this.paginatePrevious(messageReaction.message.pagination);
        break;
      case '▶':
        this.paginateNext(messageReaction.message.pagination);
        break;
      case '⏭':
        this.paginateLast(messageReaction.message.pagination);
        break;
      default:
        break;
    }
  }

  paginateNext(pagination) {
    pagination.currentPage = (pagination.currentPage + 1 <= pagination.pageCount) ? pagination.currentPage + 1 : 1;
    pagination.eventEmitter.emit('paginate', pagination.currentPage);
  }

  paginatePrevious(pagination) {
    pagination.currentPage = (pagination.currentPage - 1 < 1) ? pagination.pageCount : pagination.currentPage - 1;
    pagination.eventEmitter.emit('paginate', pagination.currentPage);
  }

  paginateFirst(pagination) {
    if (pagination.currentPage === 1) {
      return;
    }

    pagination.currentPage = 1;
    pagination.eventEmitter.emit('paginate', 1);
  }

  paginateLast(pagination) {
    if (pagination.currentPage === pagination.pageCount) {
      return;
    }

    pagination.currentPage = pagination.pageCount;
    pagination.eventEmitter.emit('paginate', pagination.pageCount);
  }
  async initPagination(message, invoker, pageCount) { // TODO: remove after 5m timeout
    if (message.guild && !message.channel.permissionsFor(message.guild.me).has('ADD_REACTIONS')) {
      winston.debug('Pagination not possible due to missing permissions!');
      return false;
    }

    winston.debug('Initializing pagination on message ID: %s', message.id);

    const pgObj = {};
    pgObj.invokerUserID = invoker.id;
    pgObj.pageCount = pageCount;
    pgObj.currentPage = 1;
    pgObj.eventEmitter = new EventEmitter();
    message.pagination = pgObj;

    this.addReactions(message);

    return pgObj.eventEmitter;
  }

  async addReactions(message) {
    await message.react('⏮');
    await message.react('◀');
    await message.react('▶');
    await message.react('⏭');
  }
}

module.exports = PaginationHelper;

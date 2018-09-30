const winston = require('winston');
const EventEmitter = require('events');

class PaginationHelper {
  constructor(main) {
    this.main = main;

    this.emojis = ['⏮', '◀', '▶', '⏭', '⏹', '🔢'];
  }

  async handleMessageReactionAddEvent(messageReaction, user) {
    if (user.bot || !messageReaction.message.pagination || messageReaction.message.pagination.invokerUserID !== user.id) {
      return;
    }

    winston.debug('Message reaction add event fired. Added emoji %s', messageReaction.emoji.name);

    if (messageReaction.message.guild && messageReaction.message.channel.permissionsFor(messageReaction.message.guild.me).has('MANAGE_MESSAGES') && this.emojis.includes(messageReaction.emoji.name)) {
      await messageReaction.users.remove(user);
    }

    this.handlePaginationClick(messageReaction);
  }

  handleMessageReactionRemoveEvent(messageReaction, user) {
    if (user.bot || !messageReaction.message.pagination || messageReaction.message.pagination.invokerUserID !== user.id) {
      return;
    }

    if (messageReaction.message.guild && messageReaction.message.channel.permissionsFor(messageReaction.message.guild.me).has('MANAGE_MESSAGES')) {
      return; // We're going to remove the user's reaction for ourselves if we have the permission for it, if not handle the user's reaction remove as 'next click'
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
      case '🔢':
        this.promptPage(messageReaction.message.pagination);
        break;
      case '⏹':
        // this.stopPagination(messageReaction.message, this.main);
        messageReaction.message.delete();
        break;
      default:
        break;
    }
  }

  async promptPage(pagination) {
    if (pagination.prompting) {
      return;
    }

    pagination.prompting = true;

    let promptMessage = await pagination.context.reply('Please type the page number you want to navigate to...');

    const promptInput = await pagination.context.channel.awaitMessages(m => m.author.id === pagination.invokerUserID && m.content.match(/^\d+$/), { max: 1, time: 10000 });

    pagination.prompting = false;

    if (promptInput.size === 0) {
      promptMessage = await promptMessage.edit('It took you too long to enter the page number to navigate to.');

      promptMessage.delete({ timeout: 5000 });

      return;
    }

    const pageNumber = Number.parseInt(promptInput.first().content, 10);

    promptMessage.delete();

    if (pagination.context.guild && pagination.context.channel.permissionsFor(pagination.context.guild.me).has('MANAGE_MESSAGES')) {
      promptInput.first().delete();
    }

    if (pageNumber > pagination.pageCount || promptInput === 0) {
      const errMsg = await pagination.context.reply(`Invalid page given (${pageNumber}/${pagination.pageCount})`);

      errMsg.delete({ timeout: 5000 });

      return;
    }

    pagination.eventEmitter.emit('paginate', pageNumber);
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

  initPagination(context, pageCount) {
    if (context.guild && !context.channel.permissionsFor(context.guild.me).has('ADD_REACTIONS')) {
      context.deleteReplies();

      winston.debug('Pagination not possible due to missing permissions!');
      context.reply(`Sorry, but this command can't be executed here because I'm missing the following permission: ${this.main.permissions.ADD_REACTIONS}`);
      return false;
    }

    const message = context.replies[0];

    winston.debug('Initializing pagination on message ID: %s', message.id);

    const pgObj = {};
    pgObj.context = context;
    pgObj.invokerUserID = context.author.id;
    pgObj.pageCount = pageCount;
    pgObj.currentPage = 1;
    pgObj.eventEmitter = new EventEmitter();
    pgObj.timer = setTimeout(this.stopPagination.bind(this, message, this.main), 120000);
    message.pagination = pgObj;

    this.addReactions(message);

    return pgObj.eventEmitter;
  }

  async addReactions(message) {
    for (const emoji of this.emojis) {
      try {
        await message.react(emoji);
      } catch (ex) {
        // do nothing on purpose
      }
    }
  }

  stopPagination(message, main) {
    if (!message.reactions) {
      return;
    }

    for (const reaction of message.reactions.values()) {
      if (this.emojis.includes(reaction.emoji.name)) {
        for (const user of reaction.users.values()) {
          if (user.id === main.api.user.id || (message.guild && message.channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES'))) {
            reaction.users.remove(user);
          }
        }
      }
    }

    delete message.pagination;
  }
}

module.exports = PaginationHelper;

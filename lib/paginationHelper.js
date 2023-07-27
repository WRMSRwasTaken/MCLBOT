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
        // this.stopPagination(messageReaction.messageCreate, this.main);
        messageReaction.message.delete(); // TODO: clicking this should cancel an open prompt (if any)
        break;
      default:
        break;
    }
  }

  async promptPage(pagination) {
    if (this.main.disabledDMs[pagination.context.author.id]) {
      return;
    }

    this.main.disabledDMs[pagination.context.author.id] = true;

    let promptMessage = await pagination.context.reply(`Please type the page number you want to navigate to... ${(!pagination.context.guild) ? '(DM commands will be disabled until then)' : ''}`);

    const promptInput = await pagination.context.channel.awaitMessages((m) => {
      if (pagination.context.guild && !m.content.match(/^\d+$/)) {
        return false;
      }

      return m.author.id === pagination.invokerUserID;
    }, { max: 1, time: 10000 });

    delete this.main.disabledDMs[pagination.context.author.id];

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

    if (Number.isNaN(pageNumber) || pageNumber > pagination.pageCount || pageNumber === 0) {
      const errMsg = await pagination.context.reply(`Invalid page given${Number.isNaN(pageNumber) ? `: ${promptInput.first().content}` : ` (${pageNumber}/${pagination.pageCount})`}`);

      errMsg.delete({ timeout: 5000 });

      return;
    }

    pagination.currentPage = pageNumber;
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

  async addReactions(message) { // TODO: apparently the channel history permission is needed too
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

  async createPaginatedEmbedList(context) { // TODO: still return a eventEmitter object because we don't have to handle missing ones in the calling code then
    if (context.guild && !context.channel.permissionsFor(context.guild.me).has('EMBED_LINKS')) {
      context.deleteReplies();

      context.reply(`Sorry, but this command can't be executed here because I'm missing the following permission: ${this.main.permissions.EMBED_LINKS}`);
      return false;
    }

    if (context.guild && !context.channel.permissionsFor(context.guild.me).has('ADD_REACTIONS')) {
      context.deleteReplies();

      winston.debug('Pagination not possible due to missing permissions!');
      context.reply(`Sorry, but this command can't be executed here because I'm missing the following permission: ${this.main.permissions.ADD_REACTIONS}`);
      return false;
    }

    const pgObj = {};
    pgObj.context = context;
    pgObj.invokerUserID = context.author.id;
    pgObj.eventEmitter = new EventEmitter();

    let message;

    pgObj.eventEmitter.on('updateContent', async (contentObject) => {
      const pageContent = contentObject.pageContent;
      const pageCount = contentObject.pageCount;
      const entryCount = contentObject.entryCount;
      const title = contentObject.title;

      pgObj.pageCount = pageCount;

      if (!message) {
        pgObj.currentPage = 1;
      }

      const embed = new this.main.Discord.MessageEmbed();

      embed.setAuthor(context.author.tag, context.author.displayAvatarURL());

      embed.addField(title, pageContent);

      if (pageCount > 1) {
        embed.setFooter(`Page ${pgObj.currentPage}/${pageCount} ${(entryCount) ? `(${entryCount} entries)` : ''}`);
      } else if (entryCount) {
        embed.setFooter(`${entryCount} ${(entryCount > 1) ? 'entries' : 'entry'}`);
      }

      if (!message) { // This is going to be the 1st call to "updateContent" which will display the 1st result page so we need to initialize the pagination here
        message = await context.reply(embed);

        if (pageCount > 1) {
          message.pagination = pgObj; // We need this later on

          winston.debug('Initializing pagination on messageCreate ID: %s with %d pages', message.id, pageCount);
          this.addReactions(message);
          pgObj.timer = setTimeout(this.stopPagination.bind(this, message, this.main), 120000);
        }
      } else {
        message.edit(embed);
      }
    });

    return pgObj.eventEmitter;
  }
}

module.exports = PaginationHelper;

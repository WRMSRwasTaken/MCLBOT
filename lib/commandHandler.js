const winston = require('winston');
const nconf = require('nconf');
const _ = require('lodash');

class CommandHandler {
  constructor(main) {
    this.main = main;
  }

  hasAttachments(message) {
    return !!message.attachments.first();
  }

  async handleMessageDeleteEvent(message) {
    if (nconf.get('bot:selfbot') && message.author.id !== this.main.api.user.id) {
      return;
    }

    if (message.author.bot) {
      return;
    }

    winston.debug('Message delete event fired! id: %s - was answered by me?', message.id, !!(message.replies && message.replies.length));
    if (!message.replies || !message.replies.length) {
      return;
    }

    message.wasDeleted = true;

    winston.debug(`Deleting ${message.replies.length} message(s)...`);

    for (const reply of message.replies) {
      if (reply && reply.deletable) {
        reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
      }
    }

    message.replies = [];
  }

  async initializeContext(messageToHandle, message, editedMessage) {
    const context = {};
    context.main = this.main;

    context.message = messageToHandle;

    context.author = message.author;

    context.isBotAdmin = !!nconf.get('bot:selfbot') || this.main.owner.includes(message.author.id);

    context.isEdited = !!editedMessage;

    context.channel = messageToHandle.channel; // exists in DM and guild

    if (messageToHandle.guild) {
      context.guild = messageToHandle.guild;
      context.member = message.member;

      const mentionExec = this.main.mentionRegex.exec(messageToHandle.content);
      context.mentionLength = (mentionExec && mentionExec[0].length) || 0;
      context.isMention = !!context.mentionLength;

      if (!context.isMention) {
        if (nconf.get('bot:selfbot')) {
          context.guildPrefix = await this.main.prefixHelper.getDefaultPrefix();
        } else {
          context.guildPrefix = await this.main.prefixHelper.getGuildPrefix(messageToHandle.guild.id);
        }
      }
    } else {
      context.isDM = true;

      if (nconf.get('bot:selfbot')) {
        context.guildPrefix = await this.main.prefixHelper.getDefaultPrefix();
      }
    }

    context.reply = async (...args) => this.messageSendFunction(context, args);

    return context;
  }

  async shouldHandle(context, message, editedMessage) {
    const messageToHandle = editedMessage || message;

    if (!context.isDM && !context.isMention && !messageToHandle.content.startsWith(context.guildPrefix)) {
      if (editedMessage && message.replies && message.replies.length) {
        // old message was responded, but the new shouldn't be handled
        winston.debug(`Old message responded to, new message should not, deleting ${message.replies.length} answer message(s)...`);

        for (const reply of message.replies) {
          if (reply && reply.deletable) {
            reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
          }
        }

        editedMessage.replies = [];
      }

      return false;
    }

    if (context.isDM && !messageToHandle.content.startsWith(context.guildPrefix) && nconf.get('bot:selfbot')) {
      return false;
    }

    if (editedMessage) {
      winston.debug('');
      winston.debug('Message edit event fired! id: %s - old content: %s - new content: %s', editedMessage.id, message.content, editedMessage.content);

      if (!message.content || !editedMessage.content || message.content === editedMessage.content) {
        winston.debug('Message content did not change... returning');
        return false;
      }

      if (message.replies.length) {
        winston.debug(`Deleting ${message.replies.length} answer message(s) to send new messages...`);

        for (const reply of messageToHandle.replies) {
          if (reply && reply.deletable) {
            reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
          }
        }

        editedMessage.replies = [];
      }

      return true;
    }

    winston.debug('');
    winston.debug('New message event fired! id: %s content: %s', messageToHandle.id, messageToHandle.content);
    return true;
  }

  async parseMessage(context) {
    let inputCommandString;
    let inputCommandParamString;

    if (context.isDM && !nconf.get('bot:selfbot')) { // direct message channel if not a selfbot
      inputCommandString = context.message.content.split(' ')[0];
      inputCommandParamString = context.message.content.substring(inputCommandString.length + 1);

      if (!inputCommandString && this.hasAttachments(context.message)) {
        context.reply('Thanks for the picture :)');
        return false;
      }

      if (context.message.content.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.prefixHelper.getDefaultPrefix()}\` in private messages. Try without.`);
        return false;
      }
    } else if (context.isMention) { // mention
      const messageWithoutMention = context.message.content.substring(context.mentionLength).trim();

      inputCommandString = messageWithoutMention.split(' ')[0];
      inputCommandParamString = messageWithoutMention.substring(inputCommandString.length + 1);

      if (!inputCommandString && this.hasAttachments(context.message) && !nconf.get('bot:selfbot')) {
        context.reply('Oh! Nice Picture :)');
        return false;
      }

      if (!context.guildPrefix) {
        context.guildPrefix = await this.main.prefixHelper.getGuildPrefix(context.guild.id);
      }

      if (!inputCommandString && !nconf.get('bot:selfbot')) {
        context.reply(`Hi! How can I help you? For help, type <@${this.main.api.user.id}> help or \`${context.guildPrefix}help\``);
        return false;
      }

      if (inputCommandString.startsWith(context.guildPrefix)) {
        context.reply(`You don't need the bot's server prefix \`${context.guildPrefix}\` in mentioned messages. Try without.`);
        return false;
      }

      if (inputCommandString.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.prefixHelper.getDefaultPrefix()}\` in mentioned messages. Try without.`);
        return false;
      }
    } else { // regular call with bot prefix
      const messageWithoutPrefix = context.message.content.substring(context.guildPrefix.length).trim();

      inputCommandString = messageWithoutPrefix.split(' ')[0];
      inputCommandParamString = messageWithoutPrefix.substring(inputCommandString.length + 1);
    }

    inputCommandString = inputCommandString.toLowerCase();

    return { inputCommandString, inputCommandParamString };
  }

  async isBlacklisted(context) {
    // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
    winston.debug(`Checking global blacklist status for user id ${context.author.id}`);

    if (await this.main.blacklistHelper.getGlobalBlacklist(context.author.id)) {
      winston.debug(`User id ${context.message.author.id} has been globally blacklisted! Returning`);
      return true;
    }
    winston.debug(`User id ${context.author.id} is not globally blacklisted`);

    if (context.isDM) {
      winston.debug('DM received, skipping user, channel and server blacklist check!');
      return false;
    }

    // global server blacklist (blacklists given server id - bot admin only)
    winston.debug(`Checking global blacklist status for server id ${context.guild.id}`);

    if (await this.main.blacklistHelper.getGuildBlacklist(context.guild.id)) {
      winston.debug(`Server id ${context.guild.id} has been globally blacklisted! Returning`);
      return true;
    }
    winston.debug(`Server id ${context.guild.id} is not globally blacklisted`);

    // per-server user blacklist (blacklists given user id on the given server id - server admin only)
    winston.debug(`Checking user blacklist status for user id ${context.author.id} on server id ${context.guild.id}`);

    if (await this.main.blacklistHelper.getUserBlacklist(context.author.id, context.guild.id)) {
      winston.debug(`User id ${context.author.id} has been blacklisted on server id ${context.guild.id}! Returning`);
      return true;
    }
    winston.debug(`User id ${context.author.id} is not blacklisted on server id ${context.guild.id}`);

    // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
    winston.debug(`Checking channel blacklist status for channel id ${context.channel.id} on server id ${context.guild.id}`);

    if (await this.main.blacklistHelper.getChannelBlacklist(context.channel.id, context.guild.id)) {
      winston.debug(`Channel id ${context.channel.id} has been blacklisted on server id ${context.guild.id}! Returning`);
      return true;
    }

    winston.debug(`Channel id ${context.channel.id} is not blacklisted on server id ${context.guild.id}`);
    return false;
  }

  getProperty(commandObject, subcommandObject, propertyName) {
    if (subcommandObject && subcommandObject[propertyName] !== undefined) {
      return subcommandObject[propertyName]; // attribute directly in subcommand set
    }

    if (subcommandObject && commandObject[propertyName] !== undefined && subcommandObject[propertyName] === undefined) {
      return commandObject[propertyName]; // attribute has been set in command and not in subcommand -> inherit
    }

    if (!subcommandObject && commandObject[propertyName] !== undefined) {
      return commandObject[propertyName]; // attribute has been set in command and no subcommand is called
    }

    return undefined; // attribute has not been set at all
  }

  hasPermission(context, commandObject, subcommandObject) {
    // bot owner check
    if (this.getProperty(commandObject, subcommandObject, 'owner') === true && !context.isBotAdmin) {
      context.reply('Sorry, but only bot administrators can execute this command.');
      return false;
    }

    const guildPermission = this.getProperty(commandObject, subcommandObject, 'permission');

    // no DM check
    if ((this.getProperty(commandObject, subcommandObject, 'guildOnly') === true || guildPermission) && context.isDM) {
      context.reply('Sorry, but this command can\'t be executed via DM.');
      return false;
    }

    // guild permission check
    if (guildPermission && !context.member.hasPermission(guildPermission) && !context.isBotAdmin) {
      context.reply(`Sorry, but your role needs the \`${guildPermission}\` permission to execute this command.`);
      return false;
    }

    return true;
  }

  getCommand(context, inputCommandString, inputCommandParamString) {
    if (!inputCommandString) {
      return false;
    }

    if (!this.main.commands[inputCommandString] && !this.main.aliases[inputCommandString]) {
      let output = 'Unknown command.';

      const related = this.main.stringUtils.findRelated(inputCommandString);

      if (related) {
        output += ` Did you mean \`${related}\`?`;
      } else if (!related && context.isDM) {
        output += ' (Maybe try commands without any prefixes?)';
      }

      if (nconf.get('bot:respondUnknown') || context.isDM || context.isMention) {
        context.reply(output);
      }
      return false;
    }

    if (!this.main.commands[inputCommandString]) {
      winston.debug('Input command %s is an alias for command %s', inputCommandString, this.main.aliases[inputCommandString]);
      inputCommandString = this.main.aliases[inputCommandString];
    }

    const inputCommand = this.main.commands[inputCommandString];

    const inputCommandParams = [];
    let inMultiwordArg = false;
    let currentArg = '';

    for (const char of inputCommandParamString.trim().split('')) { // thanks Matmen
      if (char === '"') {
        inMultiwordArg = !inMultiwordArg;
      } else if (char === ' ' && !inMultiwordArg && currentArg) {
        inputCommandParams.push(currentArg);
        currentArg = '';
      } else if (char !== ' ' || inMultiwordArg) {
        currentArg += char;
      }
    }

    if (currentArg) {
      inputCommandParams.push(currentArg);
    }

    if (inMultiwordArg) {
      context.reply('Expected closing `"`');
      return false;
    }

    if (!inputCommandParams[0] && !inputCommand.fn) {
      context.reply('Missing subcommand.');
      return false;
    }

    const inputSubCommand = (inputCommandParams[0] && inputCommand.subcommands && inputCommand.subcommands[inputCommandParams[0].toLowerCase()]) ? inputCommand.subcommands[inputCommandParams[0].toLowerCase()] : undefined;

    if (!inputCommand.fn && !inputSubCommand) {
      context.reply('Unknown subcommand.');
      return false;
    }

    if (inputSubCommand) {
      inputCommandParams.shift();
    }

    return { inputCommand, inputSubCommand, inputCommandParams };
  }

  async hasCooldown(context, inputCommand, inputSubCommand) {
    const cooldown = this.getProperty(inputCommand, inputSubCommand, 'cooldown');

    const cooldownQueryString = `cooldown:${context.author.id}:${inputCommand.name}${(inputSubCommand) ? `:${inputSubCommand.name}` : ''}`;

    this.main.prometheusMetrics.redisReads.inc();
    const redisResult = await this.main.redis.get(cooldownQueryString);

    if (!context.isBotAdmin && redisResult) {
      if (redisResult === '2' && !context.isEdited) {
        return true;
      }

      this.main.prometheusMetrics.redisWrites.inc();
      this.main.redis.incr(cooldownQueryString);

      this.main.prometheusMetrics.redisReads.inc();
      const commandCooldown = await this.main.redis.pttl(cooldownQueryString);
      context.reply(`Cooldown! Please wait another ${Math.round(commandCooldown / 100) / 10} seconds before executing \`${inputCommand.name}\` again.`);

      return true;
    }

    if (cooldown !== 0) {
      this.main.prometheusMetrics.redisWrites.inc();
      this.main.redis.set(cooldownQueryString, 1, 'EX', cooldown || 10);
    }

    return false;
  }

  async messageSendFunction(context, args) {
    if (context.message.wasDeleted) {
      return false;
    }

    let newMessage;

    try {
      newMessage = await context.message.channel.send(...args);
      context.message.replies.push(newMessage);
    } catch (err) {
      winston.error('Error sending response:', err.message);
      newMessage = await context.reply(`Ooops! I encountered an error while sending the command output:\n\`${err.message}\``);
    }

    return newMessage;
  }

  async handleMessageEvent(message, editedMessage) {
    const messageToHandle = editedMessage || message;

    if (nconf.get('bot:selfbot') && messageToHandle.author.id !== this.main.api.user.id) {
      return false;
    }

    if (messageToHandle.author.bot || messageToHandle.pinned) {
      return false;
    }

    messageToHandle.replies = messageToHandle.replies || [];

    const context = await this.initializeContext(messageToHandle, message, editedMessage);

    if (!await this.shouldHandle(context, message, editedMessage)) {
      return false;
    }

    if (!context.isBotAdmin && await this.isBlacklisted(context)) {
      return false;
    }

    if (context.guild && !context.channel.permissionsFor(context.guild.me).has('SEND_MESSAGES')) {
      return context.author.send('`SEND_MESSAGES` permission missing for this channel!');
    }

    if (context.guild && !context.channel.permissionsFor(context.guild.me).has('ATTACH_FILES')) {
      return context.reply('`ATTACH_FILES` permission missing for this channel!');
    }

    const { inputCommandString, inputCommandParamString } = await this.parseMessage(context);

    winston.debug('parseMessage() returned:', inputCommandString, inputCommandParamString);

    const { inputCommand, inputSubCommand, inputCommandParams } = this.getCommand(context, inputCommandString, inputCommandParamString);

    winston.debug('getCommand() returned: command: %s - subcommand: %s', (inputCommand) ? inputCommand.name : undefined, (inputSubCommand) ? inputSubCommand.name : undefined);

    if (!inputCommand) {
      winston.debug('No command supplied... returning');
      return false;
    }

    if (!this.hasPermission(context, inputCommand, inputSubCommand)) {
      return false;
    }

    context.command = inputCommand;
    context.subcommand = inputSubCommand;

    const commandToHandle = inputSubCommand || inputCommand;

    const paramsToPass = [];

    if (commandToHandle.arguments) {
      for (let argIndex = 0; argIndex < commandToHandle.arguments.length; argIndex++) {
        const commandArgument = commandToHandle.arguments[argIndex];

        const argumentParser = this.main.types[commandArgument.type];

        if (inputCommandParams.length === 0) {
          if (!commandArgument.optional) { // no input params left, but we're still requiring at least one
            return context.reply(this.main.stringUtils.argumentsError(context, argIndex, 'Missing argument'));
          }

          try {
            if (commandArgument.default) {
              if (typeof commandArgument.default === 'function') {
                paramsToPass.push(await commandArgument.default(context));
              } else {
                paramsToPass.push(commandArgument.default);
              }
            } else if (argumentParser.default) {
              paramsToPass.push(await argumentParser.default(context));
            }
          } catch (ex) {
            return context.reply(this.main.stringUtils.argumentsError(context, argIndex, ex.message));
          }

          continue;
        }

        let currentArgument;

        if (commandArgument.type === 'string' && commandArgument.infinite) {
          currentArgument = inputCommandParams.join(' ');
        } else {
          currentArgument = inputCommandParams[0];
        }

        winston.debug(`Trying to parse argument '${currentArgument}' for label ${commandArgument.label} as type ${argumentParser.name}`);

        try {
          const parsed = await argumentParser.parse(currentArgument, commandArgument, context);

          paramsToPass.push(parsed);
          inputCommandParams.shift();
        } catch (ex) {
          if (!commandArgument.optional || (commandArgument.optional && !commandArgument.skip)) { // if the command is not optional or if it's optional but isn't skip-able
            winston.debug(`Could not parse argument '${currentArgument}' for label ${commandArgument.label} as type ${argumentParser.name}!`);
            return context.reply(this.main.stringUtils.argumentsError(context, argIndex, ex.message));
          }

          winston.debug(`Could not parse argument '${currentArgument}' for label ${commandArgument.label} as type ${argumentParser.name}, however it is optional and has skip and a default set, passing argument to the next parser...`);

          try {
            if (commandArgument.default) {
              if (typeof commandArgument.default === 'function') {
                paramsToPass.push(await commandArgument.default(context));
              } else {
                paramsToPass.push(commandArgument.default);
              }
            } else if (argumentParser.default) {
              paramsToPass.push(await argumentParser.default(context));
            } else {
              paramsToPass.push(undefined); // just push an undefined value, because no default has been set for this argument
            }
          } catch (ex) {
            return context.reply(this.main.stringUtils.argumentsError(context, argIndex, ex.message));
          }
        }
      }
    }

    if (await this.hasCooldown(context, inputCommand, inputSubCommand)) {
      return false;
    }

    if (context.isDM) {
      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} - ` : ''}${inputCommand.name} by ${context.author.tag} (ID: ${context.author.id}) (DM)`);
    } else {
      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} - ` : ''}${inputCommand.name} by ${context.author.tag} (ID: ${context.author.id}) in channel #${context.channel.name} (ID: ${context.channel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);
    }

    this.main.prometheusMetrics.commandCountGauge.inc();

    try {
      const output = await commandToHandle.fn(context, ...paramsToPass);

      if (typeof output === 'string') {
        winston.debug('Command output was a string, passing manually to the context reply function...');

        return context.reply(output);
      }
    } catch (err) {
      winston.error('Error executing command:', inputCommand.name, err.message);
      context.reply('Ooops! I encountered an error while executing your command.');
    }

    return true;
  }
}

module.exports = CommandHandler;

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

    winston.debug('Message delete event fired. was answered by me?', !!(message.replies && message.replies.length));
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

    if (messageToHandle.guild) {
      context.guild = messageToHandle.guild;
      context.channel = messageToHandle.channel;
      context.member = message.member;

      const mentionExec = this.main.mentionRegex.exec(messageToHandle.content);
      context.mentionLength = (mentionExec && mentionExec[0].length) || 0;
      context.isMention = !!context.mentionLength;

      if (!context.isMention) {
        if (nconf.get('bot:selfbot')) {
          context.serverPrefix = await this.main.prefixHelper.getDefaultPrefix();
        } else {
          context.serverPrefix = await this.main.prefixHelper.getServerPrefix(messageToHandle.guild.id);
        }
      }
    } else {
      context.isDM = true;

      if (nconf.get('bot:selfbot')) {
        context.serverPrefix = await this.main.prefixHelper.getDefaultPrefix();
      }
    }

    context.reply = async (...args) => this.messageSendFunction(context, args);

    return context;
  }

  async shouldHandle(context, message, editedMessage) {
    const messageToHandle = editedMessage || message;

    if (!context.isDM && !context.isMention && !messageToHandle.content.startsWith(context.serverPrefix)) {
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

    if (editedMessage) {
      winston.debug('');
      winston.debug('Message edit event fired. ID: %s - %s -- %s <-> %s', editedMessage.id, message.content, editedMessage.content);

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
    winston.debug('New message event fired. ID: %s -- %s', messageToHandle.id, messageToHandle.content);
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

      if (!inputCommandString && this.hasAttachments(context.message)) {
        context.reply('Oh! Nice Picture :)');
        return false;
      }

      if (!context.serverPrefix) {
        context.serverPrefix = await this.main.prefixHelper.getServerPrefix(context.guild.id);
      }

      if (!inputCommandString) {
        context.reply(`Hi! How can I help you? For help, type <@${this.main.api.user.id}> help or \`${context.serverPrefix}help\``);
        return false;
      }

      if (inputCommandString.startsWith(context.serverPrefix)) {
        context.reply(`You don't need the bot's server prefix \`${context.serverPrefix}\` in mentioned messages. Try without.`);
        return false;
      }

      if (inputCommandString.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.prefixHelper.getDefaultPrefix()}\` in mentioned messages. Try without.`);
        return false;
      }
    } else { // regular call with bot prefix
      const messageWithoutPrefix = context.message.content.substring(context.serverPrefix.length).trim();

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

    if (await this.main.blacklistHelper.getServerBlacklist(context.guild.id)) {
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
    if (guildPermission && !context.member.hasPermission(guildPermission)) {
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

      if (nconf.get('bot:respondUnknown')) {
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

  async executeCommand(context, command, commandParameters) {


    // if (nconf.get('bot:logchannel')) {
    //   const embed = new main.Discord.RichEmbed();
    //
    //   embed.title = command;
    //
    //   if (main.api.shard) {
    //     embed.description = `Shard ID: ${main.api.shard.id}`;
    //   } else {
    //     embed.description = 'No shard';
    //   }
    //
    //   embed.author = {
    //     name: `${message.author.tag} (${message.author.id})`,
    //     icon_url: message.author.avatarURL,
    //   };
    //
    //   embed.addField('Server', (main.isPM(message)) ? 'DM' : `${message.guild.name} (${message.guild.id})`);
    //   embed.addField('Channel', (main.isPM(message)) ? 'DM' : `#${message.channel.name} (${message.channel.id})`);
    //   embed.addField('Message', `${command},${commandParameters.toString()}`);
    //   embed.timestamp = moment((message.editedTimestamp) ? message.editedTimestamp : message.createdTimestamp).toDate();
    //
    //   try {
    //     main.api.channels.get(nconf.get('bot:logchannel')).send({
    //       embed,
    //     });
    //   } catch (err) {
    //     winston.warn('Can not send log messages in the specified channel id! Disabling command logs.');
    //     nconf.set('bot:logchannel', null);
    //   }
    // }
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

    const commandToHandle = inputSubCommand || inputCommand;

    const paramsToPass = [];
    let commandFailed = false; // idk how to solve this otherwise

    if (commandToHandle.arguments && commandToHandle.arguments.length !== 0) {
      commandToHandle.arguments.forEach((commandArgument, index) => {
        if (commandFailed) {
          return false;
        }

        const argumentParser = this.main.types[commandArgument.type];
        let parsedValue;

        if (inputCommandParams.length === 0) {
          if (!commandArgument.optional) {
            context.reply(this.main.stringUtils.argumentsError(inputCommand, inputSubCommand, index, 'Missing argument'));
            commandFailed = true;
          } else {
            paramsToPass.push(argumentParser.default(context));
          }
          return false;
        }

        let currentArgument;

        if (commandArgument.type === 'string' && commandArgument.infinite) {
          currentArgument = inputCommandParams.join(' ');
        } else {
          currentArgument = inputCommandParams.shift();
        }

        winston.debug('Trying to parse argument parameter %s for command %s as type %s', currentArgument, commandToHandle.name, argumentParser.name);

        try {
          parsedValue = this.main.types[commandArgument.type].parse(currentArgument, commandArgument, context);
          paramsToPass.push(parsedValue);
        } catch (ex) {
          commandFailed = true;
          context.reply(`${ex.message} ${index}`);
        }

        return true;
      });
    }

    if (commandFailed) {
      return false;
    }

    if (await this.hasCooldown(context, inputCommand, inputSubCommand)) {
      return false;
    }

    if (context.isDM) {
      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} - ` : ''}${inputCommand.name} by ${context.author.tag} (ID: ${context.author.id}) (DM)`);
    } else {
      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} - ` : ''}${inputCommand.name} by ${context.author.tag} (ID: ${context.author.id}) in channel #${context.channel.name} (ID: ${context.channel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);
    }

    this.main.prometheusMetrics.commandContGauge.inc();

    try {
      const output = await commandToHandle.fn(context, ...paramsToPass);

      if (typeof output === 'string') {
        winston.debug('Command output was a string, passing manually to messageSendFunction()...');

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

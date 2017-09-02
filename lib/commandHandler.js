const winston = require('winston');

class CommandHandler {
  constructor(main) {
    this.main = main;
  }

  hasAttachments(message) {
    return !!message.attachments.first();
  }

  async handleMessageDeleteEvent(message) {
    if (message.author.bot) {
      return;
    }

    winston.debug('Message delete event fired. was answered by me?', !!message.replies.length);
    if (!message.replies.length) {
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

  getParamCount(command) {
    const commandParams = this.main.commands[command].args;
    const commandOptionalParams = this.main.commands[command].optArgs;

    let paramCount = 0;

    if (commandParams && typeof commandParams === 'object' && commandParams.length > 1) {
      paramCount += commandParams.length;
    }

    if (commandOptionalParams && typeof commandOptionalParams === 'object' && commandOptionalParams.length > 1) {
      paramCount += commandOptionalParams.length;
    }

    return paramCount;
  }

  async initializeContext(messageToHandle, message, editedMessage) {
    const context = {};
    context.main = this.main;

    context.message = messageToHandle;

    context.author = message.author;

    context.isBotAdmin = this.main.owner.includes(message.author.id);

    context.isEdited = !!editedMessage;

    if (messageToHandle.channel.type !== 'dm') {
      context.guild = messageToHandle.guild;
      context.channel = messageToHandle.channel;
      context.member = message.member;

      const mentionExec = this.main.mentionRegex.exec(messageToHandle.content);
      context.mentionLength = (mentionExec && mentionExec[0].length) || 0;
      context.isMention = !!context.mentionLength;

      if (!context.isMention) {
        context.serverPrefix = await this.main.prefixHelper.getServerPrefix(messageToHandle.guild.id);
      }
    } else {
      context.isDM = true;
    }

    context.reply = async (...args) => this.messageSendFunction(messageToHandle, args);

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

  async parseMessage(context, message) {
    let inputCommandString;
    let inputCommandParamString;

    if (context.isDM) { // direct message channel
      inputCommandString = message.content.split(' ')[0];
      inputCommandParamString = message.content.substring(inputCommandString.length + 1);

      if (!inputCommandString && this.hasAttachments(message)) {
        context.reply('Thanks for the picture :)');
        return false;
      }

      if (message.content.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.prefixHelper.getDefaultPrefix()}\` in private messages. Try without.`);
        return false;
      }
    } else if (context.isMention) { // mention
      const messageWithoutMention = message.content.substring(context.mentionLength).trim();

      inputCommandString = messageWithoutMention.split(' ')[0];
      inputCommandParamString = messageWithoutMention.substring(inputCommandString.length + 1);

      if (!inputCommandString && this.hasAttachments(message)) {
        context.reply('Oh! Nice Picture :)');
        return false;
      }

      if (!context.serverPrefix) {
        context.serverPrefix = await this.main.prefixHelper.getServerPrefix(message.guild.id);
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
      const messageWithoutPrefix = message.content.substring(context.serverPrefix.length).trim();

      inputCommandString = messageWithoutPrefix.split(' ')[0];
      inputCommandParamString = messageWithoutPrefix.substring(inputCommandString.length + 1);
    }

    inputCommandString = inputCommandString.toLowerCase();

    return { inputCommandString, inputCommandParamString };
  }

  async isBlacklisted(context, message) {
    // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
    winston.debug(`Checking global blacklist status for user id ${message.author.id}`);

    if (await this.main.blacklistHelper.getGlobalBlacklist(message.author.id)) {
      winston.debug(`User id ${message.author.id} has been globally blacklisted! Returning`);
      return true;
    }
    winston.debug(`User id ${message.author.id} is not globally blacklisted`);

    if (context.isDM) {
      winston.debug('DM received, skipping user, channel and server blacklist check!');
      return false;
    }

    // global server blacklist (blacklists given server id - bot admin only)
    winston.debug(`Checking global blacklist status for server id ${message.guild.id}`);

    if (await this.main.blacklistHelper.getServerBlacklist(message.guild.id)) {
      winston.debug(`Server id ${message.guild.id} has been globally blacklisted! Returning`);
      return true;
    }
    winston.debug(`Server id ${message.guild.id} is not globally blacklisted`);

    // per-server user blacklist (blacklists given user id on the given server id - server admin only)
    winston.debug(`Checking user blacklist status for user id ${message.author.id} on server id ${message.guild.id}`);

    if (await this.main.blacklistHelper.getUserBlacklist(message.author.id, message.guild.id)) {
      winston.debug(`User id ${message.author.id} has been blacklisted on server id ${message.guild.id}! Returning`);
      return true;
    }
    winston.debug(`User id ${message.author.id} is not blacklisted on server id ${message.guild.id}`);

    // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
    winston.debug(`Checking channel blacklist status for channel id ${message.channel.id} on server id ${message.guild.id}`);

    if (await this.main.blacklistHelper.getChannelBlacklist(message.channel.id, message.guild.id)) {
      winston.debug(`Channel id ${message.channel.id} has been blacklisted on server id ${message.guild.id}! Returning`);
      return true;
    }

    winston.debug(`Channel id ${message.channel.id} is not blacklisted on server id ${message.guild.id}`);
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
    if (this.getProperty(commandObject, subcommandObject, 'guildOnly') === true && (!context.isDM || guildPermission)) {
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

  stringToArray(paramString) {
    const args = [];
    let inMultiwordArg = false;
    let currentArg = '';

    for (const char of paramString.trim().split('')) {
      if (char === '"') {
        inMultiwordArg = !inMultiwordArg;
      } else if (char === ' ' && !inMultiwordArg && currentArg) {
        args.push(currentArg);
        currentArg = '';
      } else if (char !== ' ' || inMultiwordArg) currentArg += char;
    }

    if (currentArg) {
      args.push(currentArg);
    }

    return args;
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

      context.reply(output);
      return false;
    }

    if (!this.main.commands[inputCommandString]) {
      winston.debug('Input command %s is an alias for command %s', inputCommandString, this.main.aliases[inputCommandString]);
      inputCommandString = this.main.aliases[inputCommandString];
    }

    const inputCommand = this.main.commands[inputCommandString];

    const inputCommandParams = this.stringToArray(inputCommandParamString);

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

    const redisResult = await this.main.redis.get(cooldownQueryString);

    if (!context.isBotAdmin && redisResult) {
      if (redisResult === '2' && !context.isEdited) {
        return true;
      }

      this.main.redis.incr(cooldownQueryString);

      const commandCooldown = await this.main.redis.pttl(cooldownQueryString);
      context.reply(`Cooldown! Please wait another ${Math.round(commandCooldown / 100) / 10} seconds before executing \`${inputCommand}\` again.`);

      return true;
    }

    if (cooldown !== 0) {
      this.main.redis.set(cooldownQueryString, 1, 'EX', cooldown || 10);
    }

    return false;
  }

  async messageSendFunction(message, args) {
    if (message.wasDeleted) {
      return false;
    }

    let newMessage;

    try {
      newMessage = await message.channel.send(...args);
      message.replies.push(newMessage);
    } catch (err) {
      winston.error('Error sending response:', err.message);
      newMessage = await message.send(`Ooops! I encountered an error while sending the command output:\n\`${err.message}\``);
    }

    return newMessage;
  }

  async executeCommand(context, message, command, commandParameters) {
    if (context.isDM) {
      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} -` : ''} ${command.name} by ${context.author.tag} (ID: ${context.author.id}) (DM)`);
    } else {
      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} -` : ''} ${command.name} by ${context.author.tag} (ID: ${context.author.id}) in channel #${context.channel.name} (ID: ${context.channel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);
    }

    this.main.prometheusMetrics.commandContGauge.inc();

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

    try {
      const output = await command.fn(message, commandParameters, this.main);

      if (typeof output === 'string') {
        winston.debug('Command output was a string, passing manually to messageSendFunction()...');

        context.reply(output);
      }
    } catch (err) {
      winston.error('Error executing command:', command.name, commandParameters, err.message);
      context.reply('Ooops! I encountered an error while executing your command.');
    }
  }

  async handleMessageEvent(message, editedMessage) {
    const messageToHandle = editedMessage || message;
    messageToHandle.replies = messageToHandle.replies || [];

    if (messageToHandle.author.bot || messageToHandle.pinned) {
      return false;
    }

    const context = await this.initializeContext(messageToHandle, message, editedMessage);

    if (!await this.shouldHandle(context, message, editedMessage)) {
      return false;
    }

    if (!context.isBotAdmin && await this.isBlacklisted(context, messageToHandle)) {
      return false;
    }

    if (context.guild && !context.channel.permissionsFor(context.guild.me).has('SEND_MESSAGES')) {
      return context.author.send('`SEND_MESSAGES` permission missing for this channel!');
    }

    if (context.guild && !context.channel.permissionsFor(context.guild.me).has('ATTACH_FILES')) {
      return context.reply('`ATTACH_FILES` permission missing for this channel!');
    }

    const { inputCommandString, inputCommandParamString } = await this.parseMessage(context, messageToHandle);

    winston.debug('parseMessage() returned:', inputCommandString, inputCommandParamString);

    const { inputCommand, inputSubCommand, inputCommandParams } = this.getCommand(context, inputCommandString, inputCommandParamString);

    winston.debug('getCommand() returned:', (inputCommand) ? inputCommand.name : undefined, (inputSubCommand) ? inputSubCommand.name : undefined, inputCommandParams);

    if (!inputCommand) {
      winston.debug('No command supplied... returning');
      return false;
    }

    if (!this.hasPermission(context, inputCommand, inputSubCommand)) {
      return false;
    }

    // const commandParams = this.main.commands[inputCommand].args;
    //
    // const commandParamCount = this.getParamCount(inputCommand);
    //
    // if (commandParamCount <= 1) {
    //   inputCommandParams = inputCommandParams.join(' ');
    // } else if (commandParamCount < inputCommandParams.length) {
    //   winston.debug('User supplied more args than needed. Appending those...');
    //
    //   for (let i = commandParamCount; i < inputCommandParams.length; i += 1) {
    //     inputCommandParams[commandParamCount - 1] += ` ${inputCommandParams[i]}`;
    //   }
    // }
    //
    // if (this.main.commands[inputCommand].args
    //   && this.main.commands[inputCommand].args.length >= 1
    //   && inputCommandParams.length < this.main.commands[inputCommand].args.length) {
    //   return context.reply(this.main.stringUtils.argumentsError(inputCommand, inputCommandParams.length, 'Arguments missing'));
    // }

    if (!['295302159530983425'].includes(context.channel.id) && context.isBotAdmin) {
      context.reply('Sorry, but I don\'t handle command messages at the moment. Please check again later.');
      return false;
    }

    if (await this.hasCooldown(context, inputCommand, inputSubCommand)) {
      return false;
    }

    return this.executeCommand(context, messageToHandle, inputCommand, inputCommandParams);
  }
}

module.exports = CommandHandler;

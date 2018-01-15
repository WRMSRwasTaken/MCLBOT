const winston = require('winston');
const nconf = require('nconf');

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

    message.replies.forEach((reply) => {
      if (reply && reply.deletable) {
        reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
      }
    });

    message.replies = [];
  }

  async initializeContext(messageToHandle, message, editedMessage) {
    const context = {};
    context.main = this.main;

    context.message = messageToHandle;

    context.author = message.author;

    context.channel = messageToHandle.channel;

    context.isBotAdmin = !!nconf.get('bot:selfbot') || this.main.owner.includes(message.author.id);

    context.isEdited = !!editedMessage;

    context.isDM = !messageToHandle.guild;

    if (!context.isDM) {
      context.guild = messageToHandle.guild;
      context.member = message.member;

      const mentionExec = this.main.mentionRegex.exec(messageToHandle.content);
      context.mentionLength = (mentionExec && mentionExec[0].length) || 0;
      context.isMention = !!context.mentionLength;

      if (!nconf.get('bot:selfbot')) {
        context.guildPrefixDisabled = !!await this.main.prefixHelper.isGuildPrefixDisabled(context.guild.id);

        if (!context.guildPrefixDisabled) {
          context.guildPrefix = await this.main.prefixHelper.getGuildPrefix(context.guild.id);
        }
      }
    }

    if (nconf.get('bot:selfbot')) {
      context.guildPrefix = await this.main.prefixHelper.getDefaultPrefix();
    }

    if (!context.isDM || nconf.get('bot:selfbot')) {
      if (context.guildPrefixDisabled) {
        context.startsWithPrefix = false;
      } else {
        context.startsWithPrefix = messageToHandle.content.startsWith(context.guildPrefix);
      }
    }

    context.reply = async (...args) => this.messageSendFunction(context, args);

    return context;
  }

  async shouldHandle(context, message, editedMessage) {
    const messageToHandle = editedMessage || message;

    if (!context.isDM && !context.isMention && !context.startsWithPrefix) { // if in guild channel without being mentioned and no prefix in message
      if (editedMessage && message.replies && message.replies.length) { // if there is an old message that has been responded to, but the edited message shouldn't be handled so delete my old answers
        winston.debug(`I responded to the old message, but the new message isn't a bot command, deleting ${message.replies.length} answer message(s)...`);

        message.replies.forEach((reply) => {
          if (reply && reply.deletable) {
            reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
          }
        });

        editedMessage.replies = [];
      }

      return false;
    }

    if (nconf.get('bot:selfbot') && context.isDM && !context.startsWithPrefix) { // Avoid bot output while talking to other people in DM without calling bot commands
      return false;
    }

    winston.debug(''); // For easier debugging leave one blank line

    if (!editedMessage) {
      winston.debug('New message event fired! id: %s content: %s', messageToHandle.id, messageToHandle.content);
      return true;
    }

    winston.debug('Message edit event fired! id: %s - old content: %s - new content: %s', editedMessage.id, message.content, editedMessage.content);

    if (!message.content || !editedMessage.content || message.content === editedMessage.content) { // This will be the case if e.g. embed images are resolved
      winston.debug('Message content did not change... returning');
      return false;
    }

    if (message.replies.length) {
      winston.debug(`Deleting ${message.replies.length} answer message(s) to send new messages...`);

      messageToHandle.replies.forEach((reply) => {
        if (reply && reply.deletable) {
          reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
        }
      });

      editedMessage.replies = [];
    }

    return true;
  }

  async getCommandMessage(context) {
    let inputCommandString;

    if (context.isDM && !nconf.get('bot:selfbot')) { // direct message channel if not a selfbot
      inputCommandString = context.message.content; // Just pass the whole message

      if (!inputCommandString && this.hasAttachments(context.message)) {
        context.reply('Thanks for the picture :)');
        return false;
      }

      if (inputCommandString.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.prefixHelper.getDefaultPrefix()}\` in private messages. Try without.`);
        return false;
      }
    } else if (context.isMention) { // mention
      inputCommandString = context.message.content.substring(context.mentionLength).trim();

      if (!inputCommandString && this.hasAttachments(context.message) && !nconf.get('bot:selfbot')) {
        context.reply('Oh! That\'s a nice Picture :)');
        return false;
      }

      if (!inputCommandString && !nconf.get('bot:selfbot')) {
        context.reply(`Hi! How can I help you? For help, type <@${this.main.api.user.id}> help${(context.guildPrefixDisabled) ? `or \`${context.guildPrefix}help\`` : ''}`);
        return false;
      }

      if (!context.guildPrefixDisabled && inputCommandString.startsWith(context.guildPrefix)) {
        context.reply(`You don't need the bot's server prefix \`${context.guildPrefix}\` in mentioned messages. Try without.`);
        return false;
      }

      if (inputCommandString.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.prefixHelper.getDefaultPrefix()}\` in mentioned messages. Try without.`);
        return false;
      }
    } else { // regular call with bot prefix
      inputCommandString = context.message.content.substring(context.guildPrefix.length).trim();
    }

    return inputCommandString;
  }

  async isBlacklisted(context) {
    if (context.isBotAdmin) {
      return false;
    }

    // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
    winston.debug(`Checking global blacklist status for user id ${context.author.id}`);

    if (await this.main.blacklistHelper.getGlobalBlacklist(context.author.id)) {
      winston.debug(`User id ${context.author.id} has been globally blacklisted! Returning`);
      return true;
    }
    winston.debug(`User id ${context.author.id} is not globally blacklisted`);

    if (context.isDM) {
      winston.debug('DM received, skipping member, channel and server blacklist check!');
      return false;
    }

    // global server blacklist (blacklists given server id - bot admin only)
    winston.debug(`Checking global blacklist status for server id ${context.guild.id}`);

    if (await this.main.blacklistHelper.getGuildBlacklist(context.guild.id)) {
      winston.debug(`Server id ${context.guild.id} has been globally blacklisted! Returning`);
      return true;
    }
    winston.debug(`Server id ${context.guild.id} is not globally blacklisted`);

    // guild admin bypass
    if (context.member.hasPermission('ADMINISTRATOR')) {
      return false;
    }

    // per-server user blacklist (blacklists given user id on the given server id - server admin only)
    winston.debug(`Checking user blacklist status for user id ${context.author.id} on server id ${context.guild.id}`);

    if (await this.main.blacklistHelper.getMemberBlacklist(context.author.id, context.guild.id)) {
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
    if (this.getProperty(commandObject, subcommandObject, 'owner') && !context.isBotAdmin) {
      context.reply('Sorry, but only bot administrators can execute this command.');
      return false;
    }

    const permissions = this.getProperty(commandObject, subcommandObject, 'permissions');
    const selfPermissions = this.getProperty(commandObject, subcommandObject, 'selfPermissions');

    // no DM check
    if ((this.getProperty(commandObject, subcommandObject, 'guildOnly') || permissions) && context.isDM) {
      context.reply('Sorry, but this command can\'t be executed via DM.');
      return false;
    }

    // guild permission check for the calling member
    if (permissions && !context.member.hasPermission(permissions) && !context.isBotAdmin) {
      if (Array.isArray(permissions)) {
        context.reply(`Sorry, but your role needs all of the following permissions to execute this command: \`${permissions.join(', ')}\``);
      } else {
        context.reply(`Sorry, but your role needs the \`${permissions}\` permission to execute this command.`);
      }

      return false;
    }

    // guild permission check for the bot member itself
    if (!context.isDM && selfPermissions && !context.channel.permissionsFor(context.guild.me).has(selfPermissions)) {
      if (Array.isArray(selfPermissions)) {
        context.reply(`Sorry, but my role needs all of the following permissions to execute this command: \`${selfPermissions.join(', ')}\``);
      } else {
        context.reply(`Sorry, but my role needs the \`${selfPermissions}\` permission to execute this command.`);
      }

      return false;
    }

    return true;
  }

  getCommand(context, userInputString) {
    if (!userInputString) {
      winston.debug('No command string has been passed to parse... returning');
      return false;
    }

    let firstSpacePosition = userInputString.indexOf(' ');

    let commandString;
    let commandParameterString;

    if (firstSpacePosition > 0) {
      commandString = userInputString.substring(0, firstSpacePosition).toLowerCase();
      commandParameterString = userInputString.substring(firstSpacePosition + 1);
    } else { // The code above won't work if there are no spaces in the input string
      commandString = userInputString;
    }

    if (!this.main.commands[commandString] && !this.main.aliases[commandString]) {
      let output = 'Unknown command.';

      const related = this.main.stringUtils.findRelated(commandString);

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

    let inputCommand;
    let inputSubCommand;

    if (!this.main.commands[commandString]) {
      winston.debug('Input command %s is an alias for command %s', commandString, this.main.aliases[commandString]);
      inputCommand = this.main.commands[this.main.aliases[commandString]];
    } else {
      inputCommand = this.main.commands[commandString];
    }

    if (!commandParameterString && !inputCommand.fn) { // No parameter string and the main command has no function
      context.reply(`Missing subcommand. Valid subcommands are: ${Object.keys(inputCommand.subcommands).join(', ')}`);
      return false;
    }

    if (commandParameterString) {
      firstSpacePosition = commandParameterString.indexOf(' '); // Search again for the first whitespace

      let subcommandString;

      if (firstSpacePosition > 0) { // Extract the subcommand string by separating with whitespaces again
        subcommandString = commandParameterString.substring(0, firstSpacePosition).toLowerCase();
      } else { // There are no whitespaces left, so pass the parameter as a whole
        subcommandString = commandParameterString;
      }

      if (inputCommand.subcommands) {
        if (inputCommand.subcommands[subcommandString]) { // There's actually a subcommand named after the parameter passed
          inputSubCommand = inputCommand.subcommands[subcommandString];

          if (firstSpacePosition > 0) { // If there are whitespaces left, meaning there are additional parameters for the subcommand, then...
            commandParameterString = commandParameterString.substring(firstSpacePosition + 1); // ...remove the subcommand from the command parameters, + 1 to chop the whitespace at the beginning too
          } else {
            commandParameterString = undefined; // Set this to undefined, because there are no parameters to be passed to the subcommand
          }
        } else if (!inputCommand.fn) { // There's no subcommand named after the input parameter and the input command has no function
          context.reply(`Unknown subcommand. Valid subcommands are: ${Object.keys(inputCommand.subcommands).join(', ')}`);
          return false;
        }
      }
    }

    return { inputCommand, inputSubCommand, commandParameterString };
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

    if (cooldown !== 0 && !context.isBotAdmin) {
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
      if (context.guild && !context.channel.permissionsFor(context.guild.me).has('SEND_MESSAGES')) {
        if (!context.channelNoPermission) { // Just send this message only 1 time per invoked command
          const permErrMsg = await context.author.send(`Sorry, but I don't have the \`SEND_MESSAGES\` permission for channel <#${context.channel.id}> on server ${context.guild.name}! Your command output is going to be my next DM.`);
          context.message.replies.push(permErrMsg);
        }

        context.channelNoPermission = true;

        newMessage = await context.author.send(...args);
      } else {
        newMessage = await context.message.channel.send(...args);
      }

      context.message.replies.push(newMessage);
    } catch (err) {
      winston.error('Error sending response:', err.message);
      newMessage = await context.reply(`Ooops! I encountered an error while sending the command output:\n\`${err.message}\``);
    }

    return newMessage;
  }

  async parseArguments(context, commandToHandle, commandParameterString) {
    const paramsToPass = [];

    if (commandToHandle.arguments) {
      for (let argIndex = 0; argIndex < commandToHandle.arguments.length; argIndex += 1) { // Iterate through the command arguments
        const commandArgument = commandToHandle.arguments[argIndex]; // Select the current argument defined in the command file

        const argumentParser = this.main.types[commandArgument.type]; // Get the parser for the specified type

        if (!commandParameterString) {
          if (!commandArgument.optional) { // no input params left, but we're still requiring at least one
            context.reply(this.main.stringUtils.argumentsError(context, argIndex, `Missing argument of type \`${commandArgument.type}\``));
            return false;
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
            context.reply(this.main.stringUtils.argumentsError(context, argIndex, ex.message));
            return false;
          }

          // eslint-disable-next-line no-continue
          continue; // Jump to the next iteration, as we don't want to run the code under this for this loop anymore, as there are no arguments left to parse
        }

        let currentArgument = '';
        let charIndex;

        if (commandArgument.type === 'string' && commandArgument.infinite) {
          currentArgument = commandParameterString;
          commandParameterString = undefined;
        } else {
          const parameterArray = commandParameterString.split(''); // First split the string into an array of chars

          let inMultiwordArg = false;

          for (charIndex = 0; charIndex < parameterArray.length; charIndex += 1) { // Iterate over every word
            const currentChar = parameterArray[charIndex];
            if (currentChar === '"') { // Start or end of a multi-word argument
              inMultiwordArg = !inMultiwordArg;
            } else if (currentChar === ' ' && !inMultiwordArg) { // If there is a space, we're not handling a multi-word arg right now, so stop execution, because the rest is going to be parsed with the next parameter (upper loop)
              break;
            } else if (currentChar !== ' ' || inMultiwordArg) { // If this is not a whitespace or we are currently handling a multi-word argument
              currentArgument += currentChar;
            }
          }

          if (inMultiwordArg) {
            context.reply('Expected closing `"` for a multi-word argument.');
            return false;
          }
        }

        winston.debug(`Trying to parse argument '${currentArgument}' for label ${commandArgument.label} as type ${argumentParser.name}`);

        try {
          const parsed = await argumentParser.parse(currentArgument, commandArgument, context);

          if (charIndex) {
            commandParameterString = commandParameterString.substring(charIndex + 1); // Parsing was successful, so remove the argument and the space afterwards
          }

          paramsToPass.push(parsed);
        } catch (ex) {
          if (!commandArgument.optional || (commandArgument.optional && !commandArgument.skip)) { // if the command is not optional or if it's optional but isn't skip-able
            winston.debug(`Could not parse argument '${currentArgument}' for label ${commandArgument.label} as type ${argumentParser.name}!`);
            context.reply(this.main.stringUtils.argumentsError(context, argIndex, ex.message));
            return false;
          }

          winston.debug(`Could not parse argument '${currentArgument}' for label ${commandArgument.label} as type ${argumentParser.name}, however it is optional and has skip and a default set, so we're going to parse the next argument...`);

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
          } catch (ex2) {
            context.reply(this.main.stringUtils.argumentsError(context, argIndex, ex2.message));
            return false;
          }
        }
      }
    }

    return { success: true, paramsToPass };
  }

  async handleMessageEvent(message, editedMessage) {
    const messageToHandle = editedMessage || message;

    if (nconf.get('bot:selfbot') && messageToHandle.author.id !== this.main.api.user.id) {
      return false;
    }

    if (messageToHandle.author.bot || messageToHandle.pinned || messageToHandle.system) {
      return false;
    }

    messageToHandle.replies = messageToHandle.replies || [];

    const context = await this.initializeContext(messageToHandle, message, editedMessage);

    if (!await this.shouldHandle(context, message, editedMessage)) {
      return false;
    }

    if (await this.isBlacklisted(context)) {
      return false;
    }

    const inputCommandString = await this.getCommandMessage(context);

    winston.debug('getCommandMessage() returned:', inputCommandString);

    const { inputCommand, inputSubCommand, commandParameterString } = this.getCommand(context, inputCommandString);

    winston.debug('getCommand() returned: command: %s - subcommand: %s - command parameters: %s', (inputCommand) ? inputCommand.name : undefined, (inputSubCommand) ? inputSubCommand.name : undefined, commandParameterString);

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

    const { success, paramsToPass } = await this.parseArguments(context, commandToHandle, commandParameterString);

    if (!success) {
      winston.debug('parseArguments() returned no success... returning');
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

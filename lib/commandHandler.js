const winston = require('winston');
const nconf = require('nconf');
const Bluebird = require('bluebird');
const raven = require('raven');
const XRegExp = require('xregexp');

class CommandHandler {
  constructor(main) {
    this.main = main;

    this.argSplitRegex = XRegExp('(?:"([^]*?)"|(\\S+))');

    this.flagRegex = XRegExp('(?:^--([\\w]+)$|^-([\\w]+)$)');

    this.flagScanRegex = XRegExp('(?:\\s--([\\w]+)(?:$|\\s)|\\s-([\\w]+)(?:$|\\s)|\\s(--)\\s)');
  }

  hasAttachments(message) { // TODO: get rid of this function
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

  async initializeContext(message, editedMessage) {
    const messageToHandle = editedMessage || message;

    messageToHandle.replies = messageToHandle.replies || [];

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
      context.mentionLength = (mentionExec && mentionExec[0].length) || 0; // We need that later again
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

    if (!context.isDM && editedMessage && message.replies && message.replies.length === 0) { // message edit in guild channel without answers, but handled before
      editedMessage.reactions.forEach((reaction) => {
        reaction.users.forEach((user) => {
          if (user.id === this.main.api.user.id) {
            reaction.users.remove(user);
          }
        });
      });
    }

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
      winston.debug(`Deleting ${message.replies.length} answer message(s) to send new messages...`); // TODO: maybe I should re-evaluate inline answer editing

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
    let rawCommand;

    if (context.isDM && !nconf.get('bot:selfbot')) { // direct message channel if not a selfbot
      rawCommand = context.message.content; // Just pass the whole message

      if (!rawCommand && this.hasAttachments(context.message)) {
        context.reply('Thanks for the picture :)');
        return false;
      }

      if (rawCommand.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.prefixHelper.getDefaultPrefix()}\` in private messages. Try without.`);
        return false;
      }
    } else if (context.isMention) { // mention
      rawCommand = context.message.content.substring(context.mentionLength).trim();

      if (!rawCommand && this.hasAttachments(context.message) && !nconf.get('bot:selfbot')) {
        context.reply('Oh! That\'s a nice Picture :)');
        return false;
      }

      if (!rawCommand && !nconf.get('bot:selfbot')) {
        context.reply(`Hi! How can I help you? For help, type <@${this.main.api.user.id}> help${(context.guildPrefixDisabled) ? `or \`${context.guildPrefix}help\`` : ''}`);
        return false;
      }

      if (!context.guildPrefixDisabled && rawCommand.startsWith(context.guildPrefix)) {
        context.reply(`You don't need the bot's server prefix \`${context.guildPrefix}\` in mentioned messages. Try without.`);
        return false;
      }

      if (rawCommand.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.prefixHelper.getDefaultPrefix()}\` in mentioned messages. Try without.`);
        return false;
      }
    } else { // regular call with bot prefix
      rawCommand = context.message.content.substring(context.guildPrefix.length).trim();
    }

    return rawCommand;
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

  getProperty(context, propertyName) {
    const command = context.command;
    const subCommand = context.subCommand;

    if (subCommand && subCommand[propertyName] !== undefined) { // attribute directly in subCommand set
      return subCommand[propertyName];
    }

    if (command[propertyName] !== undefined) { // attribute has been set in command
      return command[propertyName];
    }

    if (command.category && this.main.categoryOverrides[command.category] && this.main.categoryOverrides[command.category][propertyName] !== undefined) { // command has a category, a category override and the category override has this attribute set
      return this.main.categoryOverrides[command.category][propertyName];
    }

    return undefined; // attribute has not been set at all
  }

  hasPermission(context) {
    // bot owner check
    if (this.getProperty(context, 'owner') && !context.isBotAdmin) {
      context.reply('Sorry, but only bot administrators can execute this command.');
      return false;
    }

    const permission = this.getProperty(context, 'permission');
    const selfPermission = this.getProperty(context, 'selfPermission');

    // no DM check
    if ((this.getProperty(context, 'guildOnly') || permission) && context.isDM) {
      context.reply('Sorry, but this command can\'t be executed via DM.');
      return false;
    }

    // guild permission check for the calling member
    if (!context.isDM && permission && !context.member.hasPermission(permission) && !context.isBotAdmin) {
      if (Array.isArray(permission)) {
        context.reply(`Sorry, but your role needs all of the following permissions to execute this command: ${permission.map(p => context.main.permissions[p]).join(', ')}`);
      } else {
        context.reply(`Sorry, but your role needs the following permission to execute this command: ${context.main.permissions[permission]}`);
      }

      return false;
    }

    // guild permission check for the bot member itself
    if (!context.isDM && selfPermission && !context.channel.permissionsFor(context.guild.me).has(selfPermission)) {
      if (Array.isArray(selfPermission)) {
        context.reply(`Sorry, but my role needs all of the following permissions to execute this command: ${selfPermission.map(p => context.main.permissions[p]).join(', ')}`);
      } else {
        context.reply(`Sorry, but my role needs the following permission to execute this command: ${context.main.permissions[selfPermission]}`);
      }

      return false;
    }

    return true;
  }

  getCommand(context) {
    const rawCommand = context.rawCommand;

    if (!rawCommand) {
      winston.debug('No command string has been passed to parse... returning');
      return false;
    }

    let inputStringWithoutPipes;
    let pipes = [];

    if (nconf.get('bot:pipeChar')) {
      const firstPipePosition = rawCommand.indexOf(nconf.get('bot:pipeChar'));

      if (firstPipePosition > 1) { // first we're going to chop off the text behind the pipe, if the command name is at least one char
        const splittedInput = rawCommand.split(nconf.get('bot:pipeChar'));

        inputStringWithoutPipes = splittedInput.shift();

        pipes = splittedInput;
      } else { // there are no pipes at all, just pass the whole input unmodified
        inputStringWithoutPipes = rawCommand;
      }
    } else { // pipes disabled
      inputStringWithoutPipes = rawCommand;
    }

    let firstSpacePosition = inputStringWithoutPipes.indexOf(' ');

    let commandString;
    let commandParameterString;

    if (firstSpacePosition > 0) {
      commandString = inputStringWithoutPipes.substring(0, firstSpacePosition).toLowerCase();
      commandParameterString = inputStringWithoutPipes.substring(firstSpacePosition).trim();
    } else { // The code above won't work if there are no spaces in the input string
      commandString = inputStringWithoutPipes.toLowerCase();
    }

    let inputSubCommand;

    const inputCommand = this.main.commands[commandString] || this.main.commands[this.main.aliases[commandString]];

    if (!inputCommand) {
      let output = 'Unknown command.';

      const related = this.main.stringUtils.findRelated(commandString);

      if (related) {
        output += ` Did you mean \`${related}\`?`;
      } else if (!related && context.isDM) {
        output += ' (Maybe try commands without any prefixes?)';
      }

      if (context.isDM || context.isMention) {
        context.reply(output);
      } else if (context.channel.permissionsFor(context.guild.me).has('ADD_REACTIONS')) {
        winston.debug('Unknown command: %s - going to add reaction', commandString);

        context.message.react('❌');
      }

      return false;
    }

    if (!this.main.commands[commandString]) {
      winston.debug('Command %s is an alias for command %s', commandString, this.main.aliases[commandString]);
    }

    if (!commandParameterString && !inputCommand.fn) { // No parameter string and the main command has no function
      context.reply(`Missing subcommand. Valid subcommands are: ${Object.keys(inputCommand.subcommands).join(', ')}`);
      return false;
    }

    if (!commandParameterString) { // No command parameters have been passed
      if (typeof inputCommand.fn === 'string') { // Root command is a redirection
        winston.debug('The main function of command %s redirects to its subcommand %s', inputCommand.name, inputCommand.fn);

        inputSubCommand = inputCommand.subcommands[inputCommand.fn];
      }
    } else { // There are command parameters to handle
      firstSpacePosition = commandParameterString.indexOf(' '); // Search again for the first whitespace

      let subcommandString;

      if (firstSpacePosition > 0) { // Extract the subCommand string by separating with whitespaces again
        subcommandString = commandParameterString.substring(0, firstSpacePosition).toLowerCase();
      } else { // There are no whitespaces left, so pass the parameter as a whole
        subcommandString = commandParameterString.toLowerCase();
      }

      if (inputCommand.subcommands) {
        inputSubCommand = inputCommand.subcommands[subcommandString] || inputCommand.subcommands[inputCommand.subcommandAliases[subcommandString]];

        if (!inputCommand.fn && !inputSubCommand) { // There's no subCommand (or subCommand alias) named after the input parameter and the input command has no function or a subcommand redirect
          context.reply(`Unknown subcommand. Valid subcommands are: ${Object.keys(inputCommand.subcommands).join(', ')}`);
          return false;
        }

        if (typeof inputCommand.fn === 'string' && !inputSubCommand) { // Root command is a redirection and no subcommand has been called explicitly
          winston.debug('The main function of command %s redirects to its subcommand %s', inputCommand.name, inputCommand.fn);

          inputSubCommand = inputCommand.subcommands[inputCommand.fn];
        } else { // We only want to access the subcommand string handler, when it is not a redirect (on explicit call)
          if (!inputCommand.subcommands[subcommandString]) {
            winston.debug('Subcommand %s is an alias for subCommand %s', subcommandString, inputCommand.subcommandAliases[subcommandString]);
          }

          if (firstSpacePosition > 0) { // If there are whitespaces left, meaning there are additional parameters for the subCommand, then...
            commandParameterString = commandParameterString.substring(firstSpacePosition).trim(); // ...remove the subCommand from the command parameters
          } else {
            commandParameterString = undefined; // Set this to undefined, because there are no parameters to be passed to the subCommand
          }
        }
      }
    }

    if (pipes.length > 0) {
      for (let pipeIndex = 0; pipeIndex < pipes.length; pipeIndex += 1) {
        const currentPipeString = pipes[pipeIndex].trim();

        if (currentPipeString === '') {
          context.reply('No pipe name specified.');
          return false;
        }

        firstSpacePosition = commandParameterString.indexOf(' ');

        const pipeName = currentPipeString.substring(0, firstSpacePosition).toLowerCase();

        if (!this.main.pipes[pipeName]) {
          context.reply('Unknown pipe name.');
          return false;
        }
      }
    }

    context.command = inputCommand;
    context.subCommand = inputSubCommand;
    context.rawCommandParameters = commandParameterString;

    return true;
  }

  async hasCooldown(context) {
    const cooldown = this.getProperty(context, 'cooldown');

    const cooldownQueryString = `cooldown:${context.author.id}:${context.command.name}${(context.subCommand) ? `:${context.subCommand.name}` : ''}`;

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

      context.reply(`Cooldown! Please wait another ${Math.round(commandCooldown / 100) / 10} seconds before executing \`${context.command.name}\` again.`);

      return true;
    }

    if (cooldown !== 0 && !context.isBotAdmin) {
      this.main.prometheusMetrics.redisWrites.inc();

      this.main.redis.set(cooldownQueryString, 1, 'EX', cooldown || nconf.get('bot:defaultCooldown'));
    }

    return false;
  }

  async messageSendFunction(context, args) {
    if (context.message.wasDeleted) {
      return false;
    }

    if (args.length !== 0 && typeof args[0] === 'string' && args[0].includes(context.main.api.token)) { // Just a little security check, eh?
      winston.warn('Message contained my token!');
      args[0] = args[0].replace(context.main.api.token, '<redacted>');
    }

    let newMessage;

    try {
      if (context.guild && !context.channel.permissionsFor(context.guild.me).has('SEND_MESSAGES')) {
        if (!context.channelNoPermission) { // Just send this message only 1 time per invoked command
          const permErrMsg = await context.author.send(`Sorry, but I don't have the permission to send messages in the channel <#${context.channel.id}> on server ${context.guild.name}! Your command output is going to be my next DM.`);
          context.message.replies.push(permErrMsg);
        }

        context.channelNoPermission = true;

        newMessage = await context.author.send(...args);
      } else {
        newMessage = await context.message.channel.send(...args);
      }

      context.message.replies.push(newMessage);

      context.answered = true;

      if (context.typing) {
        context.typing = false;
        context.channel.stopTyping();
      }
    } catch (err) {
      winston.error('Error sending response:', err.message);

      if (!context.failedOnce) { // avoid an endless loop if sending the error message also fails
        context.failedOnce = true;

        winston.debug('Sending reply error message...');

        newMessage = await context.reply(`Ooops! I encountered an error while sending the command output:\n\`${err.message}\``);
      } else {
        raven.captureException(err);

        winston.warn('We failed at sending the reply error message, giving up.');

        if (context.typing) {
          context.typing = false;
          context.channel.stopTyping();
        }
      }
    }

    return newMessage;
  }

  async parseArguments(context) {
    const commandToHandle = context.subCommand || context.command;

    let parsedArgumentsCount = 0;
    const parsedArguments = [];
    const parsedFlags = {};

    if (context.rawCommandParameters) {
      winston.debug('Going to parse input:', context.rawCommandParameters);

      let argSplitMatch;
      let flagRegexMatch;

      let disableFlagParsing = !commandToHandle.flags;
      let currentFlag;
      let currentArgument;

      let argSplitPosition = 0;

      let keepInfiniteArgument = '';
      let lastFlagEndIndex = 0;

      while (argSplitMatch = XRegExp.exec(context.rawCommandParameters, this.argSplitRegex, argSplitPosition)) { // eslint-disable-line no-cond-assign
        let splittedArgument = argSplitMatch[1] || argSplitMatch[2];

        argSplitPosition = argSplitMatch.index + splittedArgument.length; // XRegExp ignores lastIndex, so the 'g' flag doesn't work here and we have to pass the position manually

        if (splittedArgument === '--' && !disableFlagParsing) {
          disableFlagParsing = true;

          continue; // eslint-disable-line no-continue
        }

        if (disableFlagParsing) {
          flagRegexMatch = false;
        } else {
          flagRegexMatch = XRegExp.exec(splittedArgument, this.flagRegex);
        }

        if (currentFlag && flagRegexMatch) { // A flag has been passed, but the previous flag requires an additional argument
          context.reply(`Missing argument of type \`${currentFlag.type}\` for flag \`${currentFlag.name}\``);
          return false;
        }

        if (flagRegexMatch) {
          let flags;

          if (flagRegexMatch[1]) { // Long flag name
            flags = [];

            flags[0] = flagRegexMatch[1];
          } else { // Short flag name, can be multiple
            flags = flagRegexMatch[2].split('');
          }

          for (let i = 0; i < flags.length; i += 1) {
            const isLastFlag = i < flags.length;

            currentFlag = commandToHandle.flags[flags[i]] || commandToHandle.flags[commandToHandle.shortFlags[flags[i]]];

            if (!currentFlag) {
              context.reply(`Unknown flag name \`${flags[i]}\``);
              return false;
            }

            if (isLastFlag) {
              if (!currentFlag.type) { // We don't require an additional argument
                currentFlag = false;
              }
            } else {
              if (currentFlag.type) { // Current flag requires an additional argument, but isn't the last flag in the short list
                context.reply(`Missing argument of type \`${currentFlag.type}\` for flag \`${currentFlag.name}\``);
                return false;
              }

              parsedFlags[currentFlag.name] = true;
            }
          }

          continue; // eslint-disable-line no-continue
        }

        if (!currentFlag && commandToHandle.arguments && commandToHandle.arguments.length > parsedArgumentsCount) {
          currentArgument = commandToHandle.arguments[parsedArgumentsCount];
        } else {
          currentArgument = false;
        }

        if ((currentFlag && currentFlag.infinite) || (currentArgument && currentArgument.infinite) || (keepInfiniteArgument && !currentFlag)) {
          // In order to preserve whitespaces for an argument with infinite set to true, we are going to search the string for the start of a new flag from the current position of the splitter to the end

          const startOfNextFlag = XRegExp.exec(context.rawCommandParameters, this.flagScanRegex, argSplitPosition);

          if (startOfNextFlag && startOfNextFlag[3] && !disableFlagParsing) { // An flag terminator has been found while being in an infinite string argument and flag parsing has not been disabled
            disableFlagParsing = true;

            const flagTerminatorLength = startOfNextFlag[3].length;
            const flagTerminatorStartPosition = startOfNextFlag.index + 1;
            const flagTerminatorEndPosition = flagTerminatorStartPosition + flagTerminatorLength + 1;

            // We need to "extract" the flag terminator from the raw string
            context.rawCommandParameters = `${context.rawCommandParameters.substring(0, flagTerminatorStartPosition)}${context.rawCommandParameters.substring(flagTerminatorEndPosition, context.rawCommandParameters.length)}`;
          }

          const nextFlag = startOfNextFlag && (startOfNextFlag[1] || startOfNextFlag[2]);

          let splittedArgumentStartPosition = argSplitPosition - splittedArgument.length;

          if (nextFlag && !disableFlagParsing) { // If a flag has been found, we are going to cut the string until the beginning of this new flag and set the splitter's position accordingly
            splittedArgument = context.rawCommandParameters.substring(splittedArgumentStartPosition, startOfNextFlag.index);

            // argSplitPosition = startOfNextFlag.index + nextFlag.length;
            argSplitPosition = startOfNextFlag.index;

            if (currentArgument) {
              winston.debug(`Argument ${currentArgument.label} takes infinite strings, but a flag has been passed (${nextFlag}), so we're going to keep / append the string: '${splittedArgument}' until all flags have been processed or a flag with an infinite string appears`);

              keepInfiniteArgument = `${keepInfiniteArgument}${splittedArgument}`;

              continue; // eslint-disable-line no-continue
            }
          } else { // If no start of a new flag has been found, we are just going to cut the string until the end and set the splitter's position to the end, ending it's loop here
            if (!currentFlag) {
              splittedArgumentStartPosition = lastFlagEndIndex;
            }

            splittedArgument = context.rawCommandParameters.substring(splittedArgumentStartPosition, context.rawCommandParameters.length);

            argSplitPosition = context.rawCommandParameters.length; // Set the scanner position to the end of the string, ending its loop
          }
        }

        if (!currentFlag && !currentArgument && !keepInfiniteArgument) { // No flags left and command does not take more arguments
          break;
        }

        if (keepInfiniteArgument && !currentFlag) {
          splittedArgument = `${keepInfiniteArgument} ${splittedArgument}`;

          keepInfiniteArgument = ''; // We are going to parse the argument with the infinite flag now, so we unset this

          currentArgument = commandToHandle.arguments[parsedArgumentsCount];
        }

        const argumentToParse = currentArgument || currentFlag;

        const argumentParser = this.main.types[argumentToParse.type];

        winston.debug(`Trying to parse ${(currentFlag) ? 'flag' : ''} argument '${splittedArgument}' ${(currentFlag) ? `for flag ${currentFlag.name}` : `for label ${argumentToParse.label}`} as type ${argumentParser.name}`);

        try {
          const parsed = await argumentParser.parse(splittedArgument, argumentToParse, context);

          if (currentFlag) {
            parsedFlags[currentFlag.name] = parsed;

            currentFlag = false;

            lastFlagEndIndex = argSplitPosition;
          } else {
            parsedArguments.push(parsed);

            parsedArgumentsCount += 1;
          }
        } catch (ex) {
          winston.debug(`Could not parse ${(currentFlag) ? 'flag' : ''} argument '${splittedArgument}' for label ${argumentToParse.label} as type ${argumentParser.name}!`);

          if (currentFlag) {
            context.reply(`Could not parse argument for flag ${currentFlag.name}: ${ex.message}`);
          } else {
            context.reply(this.main.stringUtils.argumentError(context, parsedArgumentsCount, ex.message));
          }

          return false;
        }
      }

      if (keepInfiniteArgument) { // There's still an argument with the infinite flag set which still requires parsing
        currentArgument = commandToHandle.arguments[parsedArgumentsCount];

        const argumentParser = this.main.types[currentArgument.type];

        winston.debug(`Trying to parse argument '${keepInfiniteArgument}' for label ${currentArgument.label} as type ${argumentParser.name}`);

        try {
          const parsed = await argumentParser.parse(keepInfiniteArgument, currentArgument, context);

          parsedArguments.push(parsed);

          parsedArgumentsCount += 1;
        } catch (ex) {
          winston.debug(`Could not parse argument '${keepInfiniteArgument}' for label ${currentArgument.label} as type ${argumentParser.name}!`);

          context.reply(this.main.stringUtils.argumentError(context, parsedArgumentsCount, ex.message));

          return false;
        }
      }

      if (currentFlag) { // Current flag requires an additional argument, but we're at the end of our string
        context.reply(`Missing argument of type \`${currentFlag.type}\` for flag \`${currentFlag.name}\``);
        return false;
      }
    }

    if (commandToHandle.arguments && commandToHandle.arguments.length > parsedArgumentsCount) {
      for (parsedArgumentsCount; parsedArgumentsCount < commandToHandle.arguments.length; parsedArgumentsCount += 1) {
        const currentArgument = commandToHandle.arguments[parsedArgumentsCount];

        if (!currentArgument.optional) { // no input params left, but we're still requiring at least one
          context.reply(this.main.stringUtils.argumentError(context, parsedArgumentsCount, `Missing argument of type \`${currentArgument.type}\``));
          return false;
        }

        const argumentParser = this.main.types[currentArgument.type];

        try {
          if (currentArgument.default) {
            if (typeof currentArgument.default === 'function') {
              parsedArguments.push(await currentArgument.default(context));
            } else {
              parsedArguments.push(currentArgument.default);
            }
          } else if (argumentParser.default) {
            parsedArguments.push(await argumentParser.default(context));
          }
        } catch (ex) {
          context.reply(this.main.stringUtils.argumentError(context, parsedArgumentsCount, ex.message));
          return false;
        }
      }
    }

    context.parsedArguments = parsedArguments;
    context.parsedFlags = parsedFlags;

    return true;
  }

  async handleMessageEvent(message, editedMessage) {
    if (nconf.get('bot:selfbot') && message.author.id !== this.main.api.user.id) {
      return false;
    }

    if (message.author.bot || message.pinned || message.system) {
      return false;
    }

    const context = await this.initializeContext(message, editedMessage);

    if (!await this.shouldHandle(context, message, editedMessage)) {
      return false;
    }

    if (await this.isBlacklisted(context)) {
      return false;
    }

    context.rawCommand = await this.getCommandMessage(context);

    winston.debug('getCommandMessage() returned:', context.rawCommand);

    if (!await this.getCommand(context)) {
      return false;
    }

    winston.debug('getCommand() returned: command: %s - subCommand: %s - command parameters: %s', context.command.name, (context.subCommand) ? context.subCommand.name : undefined, context.rawCommandParameters);

    if (!this.hasPermission(context)) {
      return false;
    }

    if (await this.hasCooldown(context)) {
      return false;
    }

    if (!await this.parseArguments(context)) {
      return false;
    }

    if (context.isDM) {
      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} - ` : ''}${context.command.name} by ${context.author.tag} (ID: ${context.author.id}) (DM)`);
    } else {
      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} - ` : ''}${context.command.name} by ${context.author.tag} (ID: ${context.author.id}) in channel #${context.channel.name} (ID: ${context.channel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);
    }

    this.main.prometheusMetrics.commandCountGauge.inc();

    if (!this.getProperty(context, 'hideTyping') && !nconf.get('bot:selfbot')) {
      Bluebird.delay(500).then(() => {
        if (!context.answered) {
          if (context.guild && !context.channel.permissionsFor(context.guild.me).has('SEND_MESSAGES')) { // we need to have this permission to show the typing indicator
            return;
          }

          context.typing = true;
          context.channel.startTyping();
        }
      });

      Bluebird.delay(10000).then(() => {
        if (context.typing && !context.answered) {
          context.typing = false;
          context.channel.stopTyping();
        }
      });
    }

    try {
      const commandToHandle = context.subCommand || context.command;

      const output = await commandToHandle.fn(context, ...context.parsedArguments, context.parsedFlags);

      if (typeof output === 'string') {
        winston.debug('Command output was a string, passing manually to the context reply function...');

        return context.reply(output);
      }
    } catch (err) {
      raven.captureException(err, {
        extra: {
          guild: (context.isDM) ? 'DM' : `${context.guild.name} (ID: ${context.guild.id})`,
          channel: (context.isDM) ? 'DM' : `${context.channel.name} (ID: ${context.channel.id})`,
          user: `${context.author.tag} (ID: ${context.author.id})`,
          rawInput: context.message.content,
        },
      });

      winston.error('Error executing command:', context.command.name, err.message);
      context.reply('Ooops! I encountered an error while executing your command.');
    }

    return true;
  }
}

module.exports = CommandHandler;

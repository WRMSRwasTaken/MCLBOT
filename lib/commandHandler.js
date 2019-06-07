const winston = require('winston');
const nconf = require('nconf');
const Bluebird = require('bluebird');
const raven = require('raven');
const XRegExp = require('xregexp');

class CommandHandler {
  constructor(main) {
    this.main = main;

    this.main.disabledDMs = {};

    // Regexps for the main argument parser
    this.argSplitRegex = XRegExp('(?:"([^]*?)"|(\\S+))');
    this.flagRegex = XRegExp('(?:^--([\\w]+)$|^-([\\w]+)$)');
    this.flagScanRegex = XRegExp('(?:\\s--([\\w]+)(?:$|\\s)|\\s-([\\w]+)(?:$|\\s)|\\s(--)\\s)');

    // do this in background
    this.main.redisScanner.deleteKeys('concurrent:*'); // TODO: make this shard aware - don't delete other shard's keys
  }

  async handleMessageDeleteEvent(message) {
    if (nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false' && message.author.id !== this.main.api.user.id) {
      return;
    }

    if (message.author.bot) {
      return;
    }

    const context = message.context;

    if (!context || !context.replies || context.replies.length === 0) {
      return;
    }

    message.deleted = true;

    winston.debug(`Deleting ${context.replies.length} message(s)...`);

    for (const reply of context.replies) {
      if (reply.deletable) {
        reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
      }
    }

    context.replies = [];
  }

  async initializeContext(message, editedMessage) {
    const messageToHandle = editedMessage || message;

    let oldReplies;

    if (messageToHandle.context && messageToHandle.context.replies) {
      oldReplies = messageToHandle.context.replies; // we need to keep this for reply editing / deleting to function
    }

    const context = {};

    messageToHandle.context = context; // we need to do a circular reference, to get the context object in events passing message objects

    context.replies = oldReplies || [];

    context.invokeTime = Date.now();

    context.main = this.main;

    context.message = messageToHandle;

    context.author = message.author;

    context.channel = messageToHandle.channel;

    if (nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false') {
      context.isBotAdmin = true;
    } else {
      context.isBotAdmin = message.author.id === nconf.get('bot:owner');
    }

    context.isDM = !messageToHandle.guild;

    context.isEdited = !!editedMessage;

    context.messageEdits = messageToHandle.edits.length - 1; // we don't want to count the original message too

    context.message.currentHandled = context.messageEdits; // this get's used in the reply handler

    if (!context.isDM) {
      context.guild = messageToHandle.guild;
      context.member = message.member;

      const mentionExec = this.main.mentionRegex.exec(messageToHandle.content);
      context.mentionLength = (mentionExec && mentionExec[0].length) || 0; // We need that later again
      context.isMention = !!context.mentionLength;

      if (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false') {
        context.guildPrefixDisabled = !!await this.main.prefixHelper.isGuildPrefixDisabled(context.guild.id);

        if (!context.guildPrefixDisabled) {
          context.guildPrefix = await this.main.prefixHelper.getGuildPrefix(context.guild.id);
        }
      }
    }

    if (nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false') {
      context.guildPrefix = await this.main.prefixHelper.getDefaultPrefix();
    }

    if (!context.isDM || (nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false')) {
      if (context.guildPrefixDisabled) {
        context.startsWithPrefix = false;
      } else {
        context.startsWithPrefix = messageToHandle.content.startsWith(context.guildPrefix);
      }
    }

    context.reply = async (...args) => this.messageSendFunction(context, args);

    context.deleteReplies = async () => {
      const tempReplies = [...context.replies]; // we need to copy the array to delete old messages, but don't delete new (already added) messages

      context.replies = [];

      for (const reply of tempReplies) {
        if (reply.deletable) {
          await reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
        }
      }
    };

    return context;
  }

  async shouldHandle(context, message, editedMessage) {
    const messageToHandle = editedMessage || message;

    if (!context.isDM && editedMessage && context.replies.length === 0) { // message edit in guild channel without answers, but handled before
      for (const reaction of editedMessage.reactions.values()) {
        for (const user of reaction.users.values()) {
          if (user.id === this.main.api.user.id) {
            reaction.users.remove(user);
          }
        }
      }
    }

    if (!context.isDM && !context.isMention && !context.startsWithPrefix) { // if in guild channel without being mentioned and no prefix in message
      if (editedMessage && context.replies.length > 0) { // if there is an old message that has been responded to, but the edited message shouldn't be handled so delete my old answers
        winston.debug(`I responded to the old message, but the new message isn't a bot command, deleting ${context.replies.length} answer message(s)...`);

        context.deleteReplies();
      }

      return false;
    }

    if (nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false' && context.isDM && !context.startsWithPrefix) { // Avoid bot output while talking to other people in DM without calling bot commands
      return false;
    }

    if (!context.isBotAdmin && nconf.get('bot:stealth') && nconf.get('bot:stealth') !== 'false') {
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

    if (context.replies.length > 0) {
      winston.debug(`Deleting ${context.replies.length} answer message(s) to send new messages...`); // TODO: maybe I should re-evaluate inline answer editing

      context.deleteReplies();
    }

    return true;
  }

  async getCommandMessage(context) {
    let rawCommand;

    if (context.isDM && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) { // direct message channel if not a selfbot
      rawCommand = context.message.content; // Just pass the whole message

      if (!rawCommand && context.message.attachments.size !== 0) {
        context.reply('Thanks for the picture :)');
        return false;
      }

      if (rawCommand.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.prefixHelper.getDefaultPrefix()}\` in private messages. Try without.`);
        return false;
      }
    } else if (context.isMention) { // mention
      rawCommand = context.message.content.substring(context.mentionLength).trim();

      if (!rawCommand && context.message.attachments.size !== 0 && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) {
        context.reply('Oh! That\'s a nice Picture :)');
        return false;
      }

      if (!rawCommand && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) {
        context.reply(`Hi! How can I help you? For help, type \`@${context.guild.me.displayName} help\`${(!context.guildPrefixDisabled) ? ` or to use the bot's prefix: \`${context.guildPrefix}help\`` : ''}`);
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

  getProperty(context, propertyName, command = context.command, subcommand = context.subcommand) {
    if (subcommand && subcommand[propertyName] !== undefined) { // attribute directly in subcommand set
      return subcommand[propertyName];
    }

    if (command[propertyName] !== undefined) { // attribute has been set in command
      return command[propertyName];
    }

    if (command.category && this.main.categoryOverrides[command.category] && this.main.categoryOverrides[command.category][propertyName] !== undefined) { // command has a category, a category override and the category override has this attribute set
      return this.main.categoryOverrides[command.category][propertyName];
    }

    return undefined; // attribute has not been set at all
  }

  async hasPermission(context) { // TODO: add permission flags for subcommands too (and maybe other things too)
    // bot owner check
    if (this.getProperty(context, 'owner') && !context.isBotAdmin) {
      if (nconf.get('bot:owner')) {
        const botOwner = await this.main.userHelper.getUser(context, nconf.get('bot:owner'));

        context.reply(`Sorry, but you need to be \`${botOwner.tag}\` to use this command. (Bot administrator only)`);
      } else {
        context.reply('Sorry, but there is no bot administrator defined for this running instance, so administrator commands won\'t be available at all.');
      }
      return false;
    }

    const permission = this.getProperty(context, 'permission');
    const selfPermission = this.getProperty(context, 'selfPermission');
    const noConcurrent = this.getProperty(context, 'noConcurrent');

    // no DM check
    if ((this.getProperty(context, 'guildOnly') || permission || noConcurrent === 'guild') && context.isDM) {
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

    if (context.guild && this.getProperty(context, 'nsfw') && !context.channel.nsfw) {
      context.reply('This is a NSFW command. A channel has to be marked as NSFW in order to execute it in that channel.');

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

    if (!commandParameterString && !inputCommand.fn && this.main.commands.help) { // No parameter string and the main command has no function
      this.main.commands.help.fn(context, inputCommand.name);
      return false;
    }

    if (!commandParameterString) { // No command parameters have been passed
      if (typeof inputCommand.fn === 'string') { // Root command is a redirection
        winston.debug('The main function of command %s redirects to its subcommand %s', inputCommand.name, inputCommand.fn);

        inputSubCommand = inputCommand.subcommands[inputCommand.fn];

        context.isSubcommandRedirect = true;
      }
    } else { // There are command parameters to handle
      firstSpacePosition = commandParameterString.indexOf(' '); // Search again for the first whitespace

      let subcommandString;

      if (firstSpacePosition > 0) { // Extract the subcommand string by separating with whitespaces again
        subcommandString = commandParameterString.substring(0, firstSpacePosition).toLowerCase();
      } else { // There are no whitespaces left, so pass the parameter as a whole
        subcommandString = commandParameterString.toLowerCase();
      }

      if (inputCommand.subcommands) {
        inputSubCommand = inputCommand.subcommands[subcommandString] || inputCommand.subcommands[inputCommand.subcommandAliases[subcommandString]];

        if (!inputCommand.fn && !inputSubCommand) { // There's no subcommand (or subcommand alias) named after the input parameter and the input command has no function or a subcommand redirect
          context.reply(`Unknown subcommand. Valid subcommands are: ${Object.keys(inputCommand.subcommands).join(', ')}`);
          return false;
        }

        if (typeof inputCommand.fn === 'string' && !inputSubCommand) { // Root command is a redirection and no subcommand has been called explicitly
          winston.debug('The main function of command %s redirects to its subcommand %s', inputCommand.name, inputCommand.fn);

          inputSubCommand = inputCommand.subcommands[inputCommand.fn];

          context.isSubcommandRedirect = true;
        } else { // We only want to access the subcommand string handler, when it is not a redirect (on explicit call)
          if (inputCommand.subcommandAliases[subcommandString]) {
            winston.debug('Subcommand %s is an alias for subcommand %s', subcommandString, inputCommand.subcommandAliases[subcommandString]);
          }

          if (inputSubCommand) { // We only want to chop of the subcommand from the parameter string if it's really a called subcommand
            if (firstSpacePosition > 0) { // If there are whitespaces left, meaning there are additional parameters for the subcommand, then...
              commandParameterString = commandParameterString.substring(firstSpacePosition).trim(); // ...remove the subcommand from the command parameters
            } else {
              commandParameterString = undefined; // Set this to undefined, because there are no parameters to be passed to the subcommand
            }
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
    context.subcommand = inputSubCommand;
    context.rawCommandParameters = commandParameterString;
    context.category = inputCommand.category;

    return true;
  }

  async messageSendFunction(context, args) {
    if (context.message.deleted) { // We want to avoid sending command output for messages that the user deleted while we were still processing the command
      winston.debug(`Not replying for command ${context.command.name} because the invoke message has been deleted`);

      return false;
    }

    if (context.message.currentHandled !== context.messageEdits) { // We also want to avoid sending command output for edited messages
      winston.debug(`Not replying for command ${context.command.name} because the invoke message has been edited`);

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
          context.replies.push(permErrMsg);
        }

        context.channelNoPermission = true;

        newMessage = await context.author.send(...args);
      } else {
        newMessage = await context.message.channel.send(...args);
      }

      context.replies.push(newMessage);

      context.answered = true;

      if (context.typing) {
        context.typing = false;
        context.channel.stopTyping();
      }
    } catch (err) {
      winston.error('Error sending response: %s', err.message);

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
    const commandToHandle = context.subcommand || context.command;

    let parsedArgumentsCount = 0;
    const parsedArguments = [];
    const parsedFlags = {};

    if (context.rawCommandParameters) {
      winston.debug('Going to parse input: %s', context.rawCommandParameters);
      winston.debug('String length is: %s', context.rawCommandParameters.length);

      // Here be dragons

      let argSplitMatch;
      let flagRegexMatch;

      let disableFlagParsing = true;

      if (commandToHandle.flags) { // Command or subcommand
        disableFlagParsing = false;
      } else if (context.subcommand && !commandToHandle.flags && context.command.flags) { // Subcommand has no flags, but root command has...
        for (const flagName of Object.keys(context.command.flags)) { // ... so we're going to iterate over every flag of the root command to see if it's a global flag
          const flag = context.command.flags[flagName];

          if (flag.global) {
            disableFlagParsing = false;

            break;
          }
        }
      }

      let currentFlag;
      let currentArgument;

      let argSplitPosition = 0;

      let keepInfiniteArgument = '';
      let lastFlagEndIndex = 0;

      while (argSplitMatch = XRegExp.exec(context.rawCommandParameters, this.argSplitRegex, argSplitPosition)) { // eslint-disable-line no-cond-assign
        let splittedArgument = argSplitMatch[1] || argSplitMatch[2];

        argSplitPosition = argSplitMatch.index + splittedArgument.length; // XRegExp ignores lastIndex, so the 'g' flag doesn't work here and we have to pass the position manually

        const isMultiWordArg = !!argSplitMatch[1];

        if (isMultiWordArg) {
          argSplitPosition += 2; // We want to count those quotation marks too
        }

        if (splittedArgument === '--' && !disableFlagParsing && !currentArgument && !currentFlag && !keepInfiniteArgument) {
          disableFlagParsing = true;

          continue; // eslint-disable-line no-continue
        }

        if (splittedArgument === '--' && currentFlag) {
          context.reply(`Putting a flag terminator \`--\` inside a flag argument \`--${currentFlag.name}${(currentFlag.type) ? ` <${currentFlag.label || currentFlag.type}>` : ''}\` is not allowed.`);
          return false;
        }

        if (disableFlagParsing) {
          flagRegexMatch = false;
        } else {
          flagRegexMatch = XRegExp.exec(splittedArgument, this.flagRegex);
        }

        if (currentFlag && flagRegexMatch) { // A flag has been passed, but the previous flag requires an additional argument
          context.reply(this.main.stringUtils.flagError(context, currentFlag, `Missing flag argument of type \`${currentFlag.type}\``));
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
            const isLastFlag = i + 1 >= flags.length;

            if (context.command.flags[flags[i]] && context.command.flags[flags[i]].global) {
              currentFlag = context.command.flags[flags[i]];
            } else if (context.command.shortFlags[flags[i]] && context.command.flags[context.command.shortFlags[flags[i]]].global) {
              currentFlag = context.command.flags[context.command.shortFlags[flags[i]]];
            } else {
              currentFlag = commandToHandle.flags[flags[i]] || commandToHandle.flags[commandToHandle.shortFlags[flags[i]]];
            }

            if (!currentFlag) {
              context.reply(`Unknown flag name \`${flags[i]}\``);
              return false;
            }

            if (!currentFlag.type) { // We don't require an additional argument
              parsedFlags[currentFlag.name] = true;

              currentFlag = false;

              lastFlagEndIndex = argSplitPosition;
            } else if (!isLastFlag) {
              context.reply(this.main.stringUtils.flagError(context, currentFlag, `Missing flag argument of type \`${currentFlag.type}\``));
              return false;
            }
          }

          continue; // eslint-disable-line no-continue
        }

        // noinspection JSAnnotator
        if (!currentFlag && commandToHandle.arguments && commandToHandle.arguments.length > parsedArgumentsCount) {
          // noinspection JSAnnotator
          currentArgument = commandToHandle.arguments[parsedArgumentsCount];
        } else {
          currentArgument = false;
        }

        if ((currentFlag && currentFlag.infinite) || (currentArgument && currentArgument.infinite) || (keepInfiniteArgument && !currentFlag)) {
          // In order to preserve whitespaces for an argument with infinite set to true, we are going to search the string for the start of a new flag from the current position of the splitter to the end

          const startOfNextFlag = XRegExp.exec(context.rawCommandParameters, this.flagScanRegex, argSplitPosition - splittedArgument.length - 1); // -1 for checking whitepsaces

          if (startOfNextFlag && startOfNextFlag[3] && !disableFlagParsing) { // An flag terminator has been found while being in an infinite string argument and flag parsing has not been disabled
            disableFlagParsing = true;

            const flagTerminatorStartPosition = startOfNextFlag.index + 1;

            const flagTerminatorEndPosition = flagTerminatorStartPosition + 3;

            // We need to "extract" the flag terminator from the raw string
            context.rawCommandParameters = `${context.rawCommandParameters.substring(0, flagTerminatorStartPosition)}${context.rawCommandParameters.substring(flagTerminatorEndPosition, context.rawCommandParameters.length)}`;
          }

          const nextFlag = startOfNextFlag && (startOfNextFlag[1] || startOfNextFlag[2]);

          if (nextFlag && !disableFlagParsing) { // If a flag has been found, we are going to cut the string until the beginning of this new flag and set the splitter's position accordingly
            splittedArgument = context.rawCommandParameters.substring(argSplitPosition - splittedArgument.length, startOfNextFlag.index);

            argSplitPosition = startOfNextFlag.index;

            if (currentArgument) {
              winston.debug(`Argument ${currentArgument.label} takes infinite strings, but a flag has been passed (${nextFlag}), so we're going to keep / append the string: '${splittedArgument}' until all flags have been processed or a flag with an infinite string appears`);

              keepInfiniteArgument = `${keepInfiniteArgument}${splittedArgument}`;

              continue; // eslint-disable-line no-continue
            }
          } else { // If no start of a new flag has been found, we are just going to cut the string until the end and set the splitter's position to the end, ending it's loop here
            let splittedArgumentStartPosition = argSplitPosition - splittedArgument.length;

            if (isMultiWordArg) {
              splittedArgumentStartPosition -= 2; // We need to count the quotation marks too
            }

            if (!currentFlag && keepInfiniteArgument !== '') { // Preserve whitespaces only if there is already arguments kept for later processing
              splittedArgumentStartPosition = lastFlagEndIndex; // To preserve whitespaces for an infinite argument, we are going to set the splitter's position directly behind the ending of the flag which has no arguments or without an infinite argument
            }

            splittedArgument = context.rawCommandParameters.substring(splittedArgumentStartPosition, context.rawCommandParameters.length);

            argSplitPosition = context.rawCommandParameters.length; // Set the scanner position to the end of the string, ending its loop
          }
        }

        if (!currentFlag && !currentArgument && !keepInfiniteArgument) {
          const startOfNextFlag = XRegExp.exec(context.rawCommandParameters, this.flagScanRegex, argSplitPosition);

          const nextFlag = startOfNextFlag && (startOfNextFlag[1] || startOfNextFlag[2]);

          if (!nextFlag) {
            break;
          } else {
            argSplitPosition = startOfNextFlag.index;

            continue; // eslint-disable-line no-continue
          }
        }

        if (keepInfiniteArgument && !currentFlag) {
          splittedArgument = `${keepInfiniteArgument}${splittedArgument}`;

          keepInfiniteArgument = ''; // We are going to parse the last argument with the infinite flag now, so we unset this

          // noinspection JSAnnotator
          currentArgument = commandToHandle.arguments[parsedArgumentsCount];
        }

        const argumentToParse = currentArgument || currentFlag;

        const argumentParser = this.main.types[argumentToParse.type];

        winston.debug(`Trying to parse${(currentFlag) ? ' flag' : ''} argument '${splittedArgument}' ${(currentFlag) ? `for flag ${currentFlag.name}` : `for label ${argumentToParse.label}`} as type ${argumentParser.name}`);

        try {
          const parsed = await argumentParser.parse(splittedArgument, argumentToParse, context);

          winston.debug(`Successfully parsed${(currentFlag) ? ' flag' : ''} argument '${splittedArgument}' ${(currentFlag) ? `for flag ${currentFlag.name}` : `for label ${argumentToParse.label}`} as type ${argumentParser.name}: ${parsed.toString()}`);

          if (currentFlag) {
            parsedFlags[currentFlag.name] = parsed;

            currentFlag = false;

            lastFlagEndIndex = argSplitPosition;
          } else {
            parsedArguments.push(parsed);

            parsedArgumentsCount += 1;
          }
        } catch (ex) {
          winston.debug(`Could not parse ${(currentFlag) ? 'flag ' : ''}argument '${splittedArgument}' ${(currentFlag) ? `for flag ${currentFlag.name}` : `for label ${argumentToParse.label}`} as type ${argumentParser.name}!`);

          if (currentFlag) {
            context.reply(this.main.stringUtils.flagError(context, currentFlag, ex.message));
          } else {
            context.reply(this.main.stringUtils.argumentError(context, parsedArgumentsCount, ex.message));
          }

          return false;
        }
      }

      if (keepInfiniteArgument) { // There's still an argument with the infinite flag set which still requires parsing
        winston.debug('We are at the end of the user input string, but we have kept and infinite argument which we are going to parse now');

        // noinspection JSAnnotator
        currentArgument = commandToHandle.arguments[parsedArgumentsCount];

        const argumentParser = this.main.types[currentArgument.type];

        winston.debug(`Trying to parse argument '${keepInfiniteArgument}' for label ${currentArgument.label} as type ${argumentParser.name}`);

        try {
          const parsed = await argumentParser.parse(keepInfiniteArgument, currentArgument, context);

          winston.debug(`Successfully parsed argument '${keepInfiniteArgument}' for label ${currentArgument.label} as type ${argumentParser.name}: ${parsed.toString()}`);

          parsedArguments.push(parsed);

          parsedArgumentsCount += 1;
        } catch (ex) {
          winston.debug(`Could not parse argument '${keepInfiniteArgument}' for label ${currentArgument.label} as type ${argumentParser.name}!`);

          context.reply(this.main.stringUtils.argumentError(context, parsedArgumentsCount, ex.message));

          return false;
        }
      }

      if (currentFlag) { // Current flag requires an additional argument, but we're at the end of our string
        context.reply(this.main.stringUtils.flagError(context, currentFlag, `Missing flag argument of type \`${currentFlag.type}\``));
        return false;
      }
    }

    // noinspection JSAnnotator
    if (commandToHandle.arguments && commandToHandle.arguments.length > parsedArgumentsCount) {
      // noinspection JSAnnotator
      for (parsedArgumentsCount; parsedArgumentsCount < commandToHandle.arguments.length; parsedArgumentsCount += 1) {
        // noinspection JSAnnotator
        const currentArgument = commandToHandle.arguments[parsedArgumentsCount];

        if (!currentArgument.optional) { // no input params left, but we're still requiring at least one
          if (parsedArgumentsCount === 0 && !context.subcommand && this.main.commands.help) {
            this.main.commands.help.fn(context, context.command.name);
          } else {
            context.reply(this.main.stringUtils.argumentError(context, parsedArgumentsCount, `Missing argument of type \`${currentArgument.type}\``));
          }
          return false;
        }

        const argumentParser = this.main.types[currentArgument.type];

        try {
          if (currentArgument.default) {
            if (typeof currentArgument.default === 'function') {
              winston.debug(`Going to run COMMAND SPECIFIED default() function for label ${currentArgument.label}`);

              parsedArguments.push(await currentArgument.default(context));
            } else {
              winston.debug(`Pushing COMMAND SPECIFIED default value for label ${currentArgument.label}`);

              parsedArguments.push(currentArgument.default);
            }
          } else if (argumentParser.default) {
            if (typeof argumentParser.default === 'function') {
              winston.debug(`Going to run default() function from type ${argumentParser.name} for label ${currentArgument.label}`);

              parsedArguments.push(await argumentParser.default(context));
            } else {
              winston.debug(`Pushing default value from type ${argumentParser.name} for label ${currentArgument.label}`);

              parsedArguments.push(argumentParser.default);
            }
          } else {
            winston.debug(`Pusing undefined for label ${currentArgument.label}, as no default value has been specified either in the type ${argumentParser.name} or the command parameter`);

            parsedArguments.push(undefined);
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

  async runMiddleware(context) {
    const middleware = this.getProperty(context, 'middleware');

    if (!middleware) {
      return true;
    }

    if (Array.isArray(middleware)) {
      for (const singleMiddleware of middleware) {
        const middlewareObject = this.main.middleware[singleMiddleware];

        winston.debug('Running middleware: %s', middlewareObject.name);

        if (!await middlewareObject.run(context, ...context.parsedArguments, context.parsedFlags)) {
          winston.debug('Middleware "%s" stopped command execution.', middlewareObject.name);

          return false;
        }
      }
    } else {
      const middlewareObject = this.main.middleware[middleware];

      winston.debug('Running middleware: %s', middlewareObject.name);

      if (!await middlewareObject.run(context, ...context.parsedArguments, context.parsedFlags)) {
        winston.debug('Middleware "%s" stopped command execution.', middlewareObject.name);

        return false;
      }
    }

    return true;
  }

  async handleMessageEvent(message, editedMessage) {
    if (nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false' && message.author.id !== this.main.api.user.id) {
      return false;
    }

    if (this.main.disabledDMs[message.author.id]) { // let's *try* to avoid race conditions with the pagination helper
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

    winston.debug('getCommandMessage() returned: %s', context.rawCommand);

    if (!await this.getCommand(context)) {
      return false;
    }

    winston.debug('getCommand() returned: command: %s - subcommand: %s - command parameters: %s', context.command.name, (context.subcommand) ? context.subcommand.name : undefined, context.rawCommandParameters);

    if (!await this.hasPermission(context)) {
      return false;
    }

    if (await this.main.cooldownHelper.hasCooldown(context)) {
      return false;
    }

    if (!await this.parseArguments(context)) {
      return false;
    }

    try {
      if (!await this.runMiddleware(context)) {
        return false;
      }

      await this.main.cooldownHelper.commandCall(context);

      if (nconf.get('log:commands') === 'true') {
        if (context.isDM) {
          winston.info(`${context.command.name} by ${context.author.tag} (ID: ${context.author.id}) (DM)`);
        } else {
          winston.info(`${context.command.name} by ${context.author.tag} (ID: ${context.author.id}) in channel #${context.channel.name} (ID: ${context.channel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);
        }
      }

      this.main.prometheusMetrics.commandCountGauge.inc();

      if (!this.getProperty(context, 'hideTyping') && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) {
        Bluebird.delay(500).then(() => {
          if (!context.answered && !context.message.deleted) {
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

      const commandToHandle = context.subcommand || context.command;

      const output = await commandToHandle.fn(context, ...context.parsedArguments, context.parsedFlags);

      if (typeof output === 'string') {
        winston.debug('Command output was a string, passing manually to the context reply function...');

        await context.reply(output);
      }

      winston.debug(`Command ${context.command.name} finished in ${Date.now() - context.invokeTime}ms`); // TODO: i want to record this with prometheus too
    } catch (err) {
      raven.captureException(err, {
        extra: {
          guild: (context.isDM) ? 'DM' : `${context.guild.name} (ID: ${context.guild.id})`,
          channel: (context.isDM) ? 'DM' : `${context.channel.name} (ID: ${context.channel.id})`,
          user: `${context.author.tag} (ID: ${context.author.id})`,
          rawInput: context.message.content,
        },
      });

      winston.error('Error executing command %s: %s', context.command.name, err.message);
      context.reply('Ooops! I encountered an error while executing your command.');
    }

    return true;
  }
}

module.exports = CommandHandler;

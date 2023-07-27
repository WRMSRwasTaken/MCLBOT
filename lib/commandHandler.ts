import winston from 'winston';
import nconf from 'nconf';
import XRegExp from 'xregexp';

import {MCLBOTMain, MCLBOTContext, MCLBOTModule, MCLBOTMessage, MCLBOTCommand} from '../definitions.js';
import {DMChannel, GuildChannel, PartialDMChannel} from "discord.js";

export default class CommandHandler implements MCLBOTModule{
  private main = {} as MCLBOTMain;

  private argSplitRegex: RegExp;
  private flagRegex: RegExp;
  private flagScanRegex: RegExp;

  private tokenRegex: RegExp;
  private safeMentionRegex: RegExp;


  constructor(main: MCLBOTMain) {
    this.main = main;

    this.main.disabledDMs = {};

    // Regexps for the main argument parser
    this.argSplitRegex = XRegExp('(?:"([^]*?)"|(\\S+))');
    this.flagRegex = XRegExp('(?:^--([\\w]+)$|^-([\\w]+)$)');
    this.flagScanRegex = XRegExp('(?:\\s--([\\w]+)(?:$|\\s)|\\s-([\\w]+)(?:$|\\s)|\\s(--)\\s)');

    this.tokenRegex = XRegExp(nconf.get('bot:token'));
    this.safeMentionRegex = XRegExp('@(everyone|here)');

    // do this in background
    //this.main.redisScanner.deleteKeys('concurrent:*'); // TODO: make this shard aware - don't delete other shard's keys
  }

  initializeModule() {
    return;
  }

  async handleMessageDeleteEvent(message: MCLBOTMessage) {
    if (message.author.id === this.main.api.user?.id) {
      return;
    }

    if (message.author.bot || message.pinned || message.system) {
      return;
    }

    if (!message.replies || message.replies.length === 0) {
      return;
    }

    message.deleted = true;

    winston.debug(`Deleting ${message.replies.length} message(s)...`);

    for (const reply of message.replies) {
      if (reply.deletable) {
        reply.delete()
          .catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
      }
    }

    message.replies = [];
  }

  async initializeContext(message: MCLBOTMessage, editedMessage: MCLBOTMessage) {
    const messageToHandle = editedMessage || message;

    // things we need to store in the actual message object in order to retrieve it on an edit
    message.messageEdits = editedMessage ? message.messageEdits + 1 : 0; // we have to build this for ourselves
    message.replies = message.replies || [];

    const mentionExec = this.main.modules.userHelper.mentionRegex.exec(messageToHandle.content);

    const context: MCLBOTContext = {
      invokeTime: Date.now(),
      main: this.main,
      message: messageToHandle,
      author: messageToHandle.author,
      channel: messageToHandle.channel,
      guild: messageToHandle.guild,
      member: messageToHandle.member,
      isBotAdmin: messageToHandle.author.id === nconf.get('bot:owner'),
      isEdited: !!messageToHandle.editedAt,
      messageEdits: messageToHandle.messageEdits,
      mentionLength: (mentionExec && mentionExec[0].length) || 0,
      parsedArguments: [],
      parsedFlags: {},
      reply: async (...args) => this.messageSendFunction(context, args),
      deleteReplies: async () => this.deleteReplies(context)
    };

    context.message.currentHandled = context.messageEdits; // this gets used in the reply handler

    if (messageToHandle.guild) {
      context.guildPrefixDisabled = !! await this.main.modules.prefixHelper.isGuildPrefixDisabled(messageToHandle.guild.id);

      if (!context.guildPrefixDisabled) {
        context.guildPrefix = await this.main.modules.prefixHelper.getGuildPrefix(messageToHandle.guild.id);

        if (context.guildPrefix) {
          context.startsWithPrefix = messageToHandle.content.startsWith(context.guildPrefix);
        } else {
          context.startsWithPrefix = false;
        }
      } else {
        context.startsWithPrefix = false;
      }
    } else {
      context.startsWithPrefix = messageToHandle.content.startsWith(this.main.modules.prefixHelper.getDefaultPrefix());
    }

    return context;
  }

  async deleteReplies(context: MCLBOTContext) {
    const tempReplies = context.message.replies.slice(); // we need to copy the array to delete old messages, but don't delete new (already added) replies

    context.message.replies = [];

    for (const reply of tempReplies) {
      if (reply.deletable) {
        await reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
      }
    }
  }

  async shouldHandle(context: MCLBOTContext, message: MCLBOTMessage, editedMessage: MCLBOTMessage) {
    if (context.guild && context.isEdited && message.replies.length === 0) { // message edit in guild channel without answers, but handled before
      for (const reaction of message.reactions.values()) {
        reaction.clear();
      }
    }

    if (context.guild && context.mentionLength === 0 && !context.startsWithPrefix) { // if in guild channel without being mentioned and no prefix in message
      if (context.isEdited && message.replies.length > 0) { // if there is an old message that has been responded to, but the edited message shouldn't be handled so delete my old answers
        winston.debug(`I responded to the old message, but the new message isn't a bot command, deleting ${message.replies.length} answer message(s)...`);

        context.deleteReplies();
      }

      return false;
    }

    if (!context.isBotAdmin && nconf.get('bot:stealth') && nconf.get('bot:stealth') !== 'false') {
      return false;
    }

    winston.debug(''); // For easier debugging leave one blank line

    if (!context.isEdited) {
      winston.debug('New message event fired! id: %s content: %s', message.id, message.content);
      return true;
    }

    winston.debug('Message edit event fired! id: %s - old content: %s - new content: %s', editedMessage.id, message.content, editedMessage.content);

    if (message.replies.length > 0) {
      winston.debug(`Deleting ${message.replies.length} answer message(s) to send new messages...`); // TODO: maybe I should re-evaluate inline answer editing

      context.deleteReplies();
    }

    return true;
  }

  async getCommandMessage(context: MCLBOTContext) {
    let rawCommand;

    if (!context.guild) { // direct message channel
      rawCommand = context.message.content; // Just pass the whole message

      if (!rawCommand && context.message.attachments.size !== 0) {
        context.reply('Oh! That\'s a nice Picture :)');
        return false;
      }

      if (context.startsWithPrefix) {
        context.reply(`You don't need the bot's default prefix \`${this.main.modules.prefixHelper.getDefaultPrefix()}\` in private messages. Try without.`);
        return false;
      }

      if (context.mentionLength > 0) {
        context.reply(`You don't need to mention me in private messages. Try without.`);
        return false;
      }

      return rawCommand;
    } else if (context.mentionLength > 0) { // mention
      rawCommand = context.message.content.substring(context.mentionLength).trim();

      if (!rawCommand && context.message.attachments.size !== 0) {
        context.reply('Oh! That\'s a nice Picture :)');
        return false;
      }

      if (!rawCommand) {
        context.reply(`Hi! How can I help you? For help, type \`@${context.guild.members.me?.displayName} help\`${(!context.guildPrefixDisabled) ? ` or to use the bot's prefix: \`${context.guildPrefix}help\`` : ''}`);
        return false;
      }

      if (!context.guildPrefixDisabled && context.guildPrefix && rawCommand.startsWith(context.guildPrefix)) {
        context.reply(`You don't need the bot's server prefix \`${context.guildPrefix}\` in mentioned messages. Try without.`);
        return false;
      }

      if (rawCommand.startsWith(this.main.modules.prefixHelper.getDefaultPrefix())) {
        context.reply(`You don't need the bot's default prefix \`${this.main.modules.prefixHelper.getDefaultPrefix()}\` in mentioned messages. Try without.`);
        return false;
      }

      return rawCommand;
    } else if (context.guildPrefix) { // regular call with bot prefix
      return context.message.content.substring(context.guildPrefix.length).trim();
    }

    return false; // should never happen
  }

  async isBlacklisted(context: MCLBOTContext) {
    if (context.isBotAdmin) {
      return false;
    }

    // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
    winston.debug(`Checking global blacklist status for user id ${context.author.id}`);

    if (await this.main.modules.blacklistHelper.getGlobalBlacklist(context.author.id)) {
      winston.debug(`User id ${context.author.id} has been globally blacklisted! Returning`);
      return true;
    }
    winston.debug(`User id ${context.author.id} is not globally blacklisted`);

    if (!context.guild) {
      winston.debug('DM received, skipping member, channel and server blacklist check!');
      return false;
    }

    // global server blacklist (blacklists given server id - bot admin only)
    winston.debug(`Checking global blacklist status for server id ${context.guild.id}`);

    if (await this.main.modules.blacklistHelper.getGuildBlacklist(context.guild.id)) {
      winston.debug(`Server id ${context.guild.id} has been globally blacklisted! Returning`);
      return true;
    }
    winston.debug(`Server id ${context.guild.id} is not globally blacklisted`);

    if(context.channel instanceof GuildChannel) {
      // guild admin bypass
      if (context.member && context.channel.permissionsFor(context.member).has('Administrator')) {
        return false;
      }
    }

    // per-server user blacklist (blacklists given user id on the given server id - server admin only)
    winston.debug(`Checking user blacklist status for user id ${context.author.id} on server id ${context.guild.id}`);

    if (await this.main.modules.blacklistHelper.getMemberBlacklist(context.author.id, context.guild.id)) {
      winston.debug(`User id ${context.author.id} has been blacklisted on server id ${context.guild.id}! Returning`);
      return true;
    }
    winston.debug(`User id ${context.author.id} is not blacklisted on server id ${context.guild.id}`);

    // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
    winston.debug(`Checking channel blacklist status for channel id ${context.channel.id} on server id ${context.guild.id}`);

    if (await this.main.modules.blacklistHelper.getChannelBlacklist(context.channel.id, context.guild.id)) {
      winston.debug(`Channel id ${context.channel.id} has been blacklisted on server id ${context.guild.id}! Returning`);
      return true;
    }

    winston.debug(`Channel id ${context.channel.id} is not blacklisted on server id ${context.guild.id}`);
    return false;
  }

  getProperty(context: MCLBOTContext, propertyName: string, command: MCLBOTCommand = context.command, subcommand: MCLBOTCommand = context.subcommand) {
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

  async hasPermission(context: MCLBOTContext) { // TODO: add permission flags for subcommands too (and maybe other things too)
    if (this.getProperty(context, 'owner') && !context.isBotAdmin) { // bot owner check
      if (nconf.get('bot:owner')) {
        const botOwner = await this.main.modules.userHelper.getUser(context, nconf.get('bot:owner'));

        context.reply(`Sorry, but you need to be \`${botOwner.tag}\` to use this command. (Bot administrator only)`);
      } else {
        context.reply('Sorry, but there is no bot administrator defined for this running instance, so administrator commands won\'t be available at all.');
      }
      return false;
    }

    const permission = this.getProperty(context, 'permission');
    const selfPermission = this.getProperty(context, 'selfPermission');
    const noConcurrent = this.getProperty(context, 'noConcurrent');

    if ((this.getProperty(context, 'guildOnly') || permission || noConcurrent === 'guild') && !context.guild) { // no DM check
      context.reply('Sorry, but this command can\'t be executed via DM.');
      return false;
    }

    if (context.guild && permission && !context.channel.permissionsFor(context.member).has(permission) && !context.isBotAdmin) { // guild permission check for the calling member
      if (Array.isArray(permission)) {
        context.reply(`Sorry, but your role needs all of the following permissions to execute this command: ${permission.map((p) => context.main.permissions[p])
          .join(', ')}`);
      } else {
        context.reply(`Sorry, but your role needs the following permission to execute this command: ${context.main.permissions[permission]}`);
      }

      return false;
    }

    if (context.guild && selfPermission && !context.channel.permissionsFor(this.main.api.user).has(selfPermission)) { // guild permission check for the bot member itself
      if (Array.isArray(selfPermission)) {
        context.reply(`Sorry, but my role needs all of the following permissions to execute this command: ${selfPermission.map((p) => context.main.permissions[p])
          .join(', ')}`);
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

  getCommand(context: MCLBOTContext) {
    const rawCommand = context.rawCommand;

    if (!rawCommand) {
      winston.debug('No command string has been passed to parse... returning');
      return false;
    }

    // let inputStringWithoutPipes;
    // let pipes = [];
    //
    // if (nconf.get('bot:pipeChar')) {
    //   const firstPipePosition = rawCommand.indexOf(nconf.get('bot:pipeChar'));
    //
    //   if (firstPipePosition > 1) { // first we're going to chop off the text behind the pipe, if the command name is at least one char
    //     const splittedInput = rawCommand.split(nconf.get('bot:pipeChar'));
    //
    //     inputStringWithoutPipes = splittedInput.shift();
    //
    //     pipes = splittedInput;
    //   } else { // there are no pipes at all, just pass the whole input unmodified
    //     inputStringWithoutPipes = rawCommand;
    //   }
    // } else { // pipes disabled
    //   inputStringWithoutPipes = rawCommand;
    // }

    const inputStringWithoutPipes = rawCommand;
    let firstSpacePosition = inputStringWithoutPipes.indexOf(' ');

    let commandString;
    let commandParameterString;

    if (firstSpacePosition > 0) {
      commandString = inputStringWithoutPipes.substring(0, firstSpacePosition)
        .toLowerCase();
      commandParameterString = inputStringWithoutPipes.substring(firstSpacePosition)
        .trim();
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
      } else if (!related && !context.guild) {
        output += ' (Maybe try commands without any prefixes?)';
      }

      if (!context.guild || context.mentionLength === 0) {
        context.reply(output);
      } else if (context.channel.permissionsFor(this.main.api.user).has('ADD_REACTIONS')) {
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
        subcommandString = commandParameterString.substring(0, firstSpacePosition)
          .toLowerCase();
      } else { // There are no whitespaces left, so pass the parameter as a whole
        subcommandString = commandParameterString.toLowerCase();
      }

      if (inputCommand.subcommands) {
        inputSubCommand = inputCommand.subcommands[subcommandString] || inputCommand.subcommands[inputCommand.subcommandAliases[subcommandString]];

        if (!inputCommand.fn && !inputSubCommand) { // There's no subcommand (or subcommand alias) named after the input parameter and the input command has no function or a subcommand redirect
          context.reply(`Unknown subcommand. Valid subcommands are: ${Object.keys(inputCommand.subcommands)
            .join(', ')}`);
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
              commandParameterString = commandParameterString.substring(firstSpacePosition)
                .trim(); // ...remove the subcommand from the command parameters
            } else {
              commandParameterString = undefined; // Set this to undefined, because there are no parameters to be passed to the subcommand
            }
          }
        }
      }
    }

    // if (pipes.length > 0) {
    //   for (let pipeIndex = 0; pipeIndex < pipes.length; pipeIndex += 1) {
    //     const currentPipeString = pipes[pipeIndex].trim();
    //
    //     if (currentPipeString === '') {
    //       context.reply('No pipe name specified.');
    //       return false;
    //     }
    //
    //     firstSpacePosition = commandParameterString.indexOf(' ');
    //
    //     const pipeName = currentPipeString.substring(0, firstSpacePosition)
    //       .toLowerCase();
    //
    //     if (!this.main.pipes[pipeName]) {
    //       context.reply('Unknown pipe name.');
    //       return false;
    //     }
    //   }
    // }

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

    if (args.length !== 0 && typeof args[0] === 'string') {
      if (args[0].includes(context.main.api.token)) { // Just a little security check, eh?
        winston.warn('Message contained my token!');

        // raven.captureException(new Error('Message output contained bot token'), {
        //   extra: {
        //     guild: (context.isDM) ? 'DM' : `${context.guild.name} (ID: ${context.guild.id})`,
        //     channel: (context.isDM) ? 'DM' : `${context.channel.name} (ID: ${context.channel.id})`,
        //     user: `${context.author.tag} (ID: ${context.author.id})`,
        //     rawInput: context.message.content,
        //   },
        // });

        args[0] = XRegExp.replace(args[0], this.tokenRegex, '<redacted>', 'all');
      }

      // prevent bot output mentioning users with @everyone or @here
      args[0] = XRegExp.replace(args[0], this.safeMentionRegex, '@\u200b${1}', 'all'); // eslint-disable-line no-template-curly-in-string
    }

    let newMessage;
    let sendTo;

    try {
      if (context.guild && !context.channel.permissionsFor(this.main.api.user).has('SEND_MESSAGES')) {
        if (!context.channelNoPermission) { // Just send this message only 1 time per invoked command
          const permErrMsg = await context.author.send(`Sorry, but I don't have the permission to send messages in the channel <#${context.channel.id}> on server ${context.guild.name}! Your command output is going to be my next DM.`);
          context.message.replies.push(permErrMsg);
        }

        context.channelNoPermission = true;

        sendTo = context.author;
      } else {
        sendTo = context.message.channel;
      }

      if (args.length !== 0 && typeof args[0] === 'string' && args[0].length > 2000) {
        if (context.guild && !context.channel.permissionsFor(this.main.api.user).has('ATTACH_FILES')) {
          newMessage = await sendTo.send('Sorry, but I don\'t have the permission to attach messages in this channel.');
        } else {
          newMessage = await sendTo.send({
            files: [{
              attachment: Buffer.from(args[0]),
              name: `${context.command.name}.txt`,
            }],
          });
        }
      } else {
        newMessage = await sendTo.send(...args);
      }

      context.message.replies.push(newMessage);

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

        if (!splittedArgument) {
          argSplitPosition += 2;

          continue; // eslint-disable-line no-continue
        }

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
    if (message.author.id === this.main.api.user.id) {
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

    if (await this.main.modules.cooldownHelper.hasCooldown(context)) {
      return false;
    }

    if (!await this.parseArguments(context)) {
      return false;
    }

    try {
      if (!await this.runMiddleware(context)) {
        return false;
      }

      await this.main.modules.cooldownHelper.commandCall(context);

      if (nconf.get('log:commands') === 'true') {
        if (!context.guild) {
          winston.info(`${context.command.name} by ${context.author.tag} (ID: ${context.author.id}) (DM)`);
        } else {
          winston.info(`${context.command.name} by ${context.author.tag} (ID: ${context.author.id}) in channel #${context.channel.name} (ID: ${context.channel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);
        }
      }

      // this.main.prometheusMetrics.commandInvocations.labels(context.command.name)
      //   .inc();

      // if (!this.getProperty(context, 'hideTyping') && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) {
      //   Bluebird.delay(500).then(() => {
      //     if (!context.answered && !context.message.deleted) {
      //       if (context.guild && !context.channel.can('SEND_MESSAGES')) { // we need to have this permission to show the typing indicator
      //         return;
      //       }
      //
      //       context.typing = true;
      //       context.channel.startTyping();
      //     }
      //   });
      //
      //   Bluebird.delay(10000).then(() => {
      //     if (context.typing && !context.answered) {
      //       context.typing = false;
      //       context.channel.stopTyping();
      //     }
      //   });
      // }

      const commandToHandle = context.subcommand || context.command;

      const output = await commandToHandle.fn(context, ...context.parsedArguments, context.parsedFlags);

      if (typeof output === 'string') {
        winston.debug('Command output was a string, passing manually to the context reply function...');

        await context.reply(output);
      }

      winston.debug(`Command ${context.command.name} finished in ${Date.now() - context.invokeTime}ms`); // TODO: i want to record this with prometheus too
      // this.main.prometheusMetrics.commandExecutionTimes.labels(context.command.name)
      //   .inc(Date.now() - context.invokeTime);
    } catch (err) {
      // raven.captureException(err, {
      //   extra: {
      //     guild: (context.isDM) ? 'DM' : `${context.guild.name} (ID: ${context.guild.id})`,
      //     channel: (context.isDM) ? 'DM' : `${context.channel.name} (ID: ${context.channel.id})`,
      //     user: `${context.author.tag} (ID: ${context.author.id})`,
      //     rawInput: context.message.content,
      //   },
      // });

      winston.error('Error executing command %s: %s', context.command.name, err.message);
      context.reply('Ooops! I encountered an error while executing your command.');
    }

    return true;
  }
}

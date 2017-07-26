const winston = require('winston');
const nconf = require('nconf');
const moment = require('moment');


class CommandHandler {
  constructor(main) {
    this.main = main;
  }

  isMyMessage(message) {
    return message.author.id === this.main.api.user.id;
  }

  isBot(message) {
    return message.author.bot;
  }

  isDM(message) {
    return message.channel.type === 'dm';
  }

  hasAttachments(message) {
    return !!message.attachments.first();
  }

  isMention(message) {
    return this.main.mentionRegex.test(message.content);
  }

  async startsWithPrefix(message) {
    let serverPrefix;

    if (message.guild) {
      serverPrefix = await this.main.prefixHelper.getServerPrefix(message.guild.id);
    } else {
      serverPrefix = this.main.prefixHelper.getDefaultPrefix();
    }

    return message.content.trim().startsWith(serverPrefix);
  }

  async shouldHandle(message) {
    if (this.isMyMessage(message)) {
      return false;
    }

    if (this.isBot(message)) {
      return false;
    }

    if (message.pinned) {
      return false;
    }

    if (!this.isDM(message) && !this.isMention(message)) {
      const startsWithPrefix = await this.startsWithPrefix(message);

      return startsWithPrefix;
    }

    return true;
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

  async messageSendFunction(message, args, editMessage = false) {
    if (message.wasDeleted) {
      return false;
    }

    let newMessage;

    try {
      if (editMessage) {
        newMessage = await editMessage.edit(...args);
      } else {
        newMessage = await message.channel.send(...args);
        message.replies.push(newMessage);
      }
    } catch (err) {
      winston.error('Error sending response:', err.message);
      newMessage = await message.send('Ooops! I encountered an error while sending the command output.');
    }

    return newMessage;
  }

  async handleCommand(message, inputCommand, inputCommandParams) {
    if (this.isDM(message)) {
      winston.info(`${inputCommand} by ${message.author.tag} (ID: ${message.author.id}) (DM)`);
    } else {
      winston.info(`${inputCommand} by ${message.author.tag} (ID: ${message.author.id}) in channel #${message.channel.name} (ID: ${message.channel.id}) on server ${message.guild.name} (ID: ${message.guild.id})`);
    }

    // if (nconf.get('bot:logchannel')) {
    //   const embed = new main.Discord.RichEmbed();
    //
    //   embed.title = inputCommand;
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
    //   embed.addField('Message', `${inputCommand},${inputCommandParams.toString()}`);
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
      winston.debug('Executing command:', inputCommand, inputCommandParams);
      const output = await this.main.commands[inputCommand].fn(message, inputCommandParams, this.main);

      if (typeof output === 'string') {
        winston.debug('Command output was a string, passing manually to messageSendFunction()...');

        message.send(output);
      }
    } catch (err) {
      winston.error('Error executing command:', inputCommand, inputCommandParams, err.message);
      message.send('Ooops! I encountered an error while executing your command.');
    }
  }

  async handleMessage(message, editMessage) {
    let inputCommand;
    let inputCommandParamString;

    // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
    winston.debug(`Checking global blacklist status for user id ${message.author.id}`);

    const globalBlacklistResult = await this.main.blacklistHelper.getGlobalBlacklist(message.author.id);

    if (globalBlacklistResult) {
      winston.debug(`User id ${message.author.id} has been globally blacklisted! Returning`);
      return false;
    }
    winston.debug(`User id ${message.author.id} is not globally blacklisted`);

    if (!this.isDM(message)) {
      // global server blacklist (blacklists given server id - bot admin only)
      // TODO

      // per-server user blacklist (blacklists given user id on the given server id - server admin only)
      winston.debug(`Checking user blacklist status for user id ${message.author.id} on server id ${message.guild.id}`);

      const userBlacklistResult = await this.main.blacklistHelper.getUserBlacklist(message.author.id, message.guild.id);

      if (userBlacklistResult) {
        winston.debug(`User id ${message.author.id} has been blacklisted on server id ${message.guild.id}! Returning`);
        return false;
      }
      winston.debug(`User id ${message.author.id} is not blacklisted on server id ${message.guild.id}`);

      // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
      winston.debug(`Checking channel blacklist status for channel id ${message.channel.id} on server id ${message.guild.id}`);

      const channelBlacklistResult = await this.main.blacklistHelper.getChannelBlacklist(message.channel.id, message.guild.id);

      if (channelBlacklistResult) {
        winston.debug(`Channel id ${message.channel.id} has been blacklisted on server id ${message.guild.id}! Returning`);
        return false;
      }
      winston.debug(`Channel id ${message.channel.id} is not blacklisted on server id ${message.guild.id}`);
    } else {
      winston.debug('DM received, skipping user, channel and server blacklist check!');
    }

    message.responded = true;
    message.replies = message.replies || [];

    message._send = message.send;

    message.send = async (...args) => {
      if (editMessage && typeof args[0] === 'string' && args[0] === editMessage.content) {
        winston.debug('My edit would be the same message... returning the replied message object');
        return editMessage; // We must return the message object to allow further edits
      }

      return this.messageSendFunction(message, args, editMessage);
    };

    if (message.guild && !message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) {
      return message.author.send('`SEND_MESSAGES` permission missing for this channel!');
    }

    if (message.guild && !message.channel.permissionsFor(message.guild.me).has('ATTACH_FILES')) {
      return message.channel.send('`ATTACH_FILES` permission missing for this channel!');
    }


    if (this.isDM(message)) { // direct message channel
      inputCommand = message.content.split(' ')[0];
      inputCommandParamString = message.content.substring(inputCommand.length + 1);

      if (!inputCommand && this.hasAttachments(message)) {
        return message.send('Oh! Nice Picture :)');
      }

      if (message.content.trim().startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        return message.send(`You don't need \`${this.main.prefixHelper.getDefaultPrefix()}\` in private messages. Try without.`);
      }
    } else if (this.isMention(message)) { // mention
      const msgArr = message.content.split(' ');
      inputCommand = msgArr[1];

      if (!inputCommand && this.hasAttachments(message)) {
        return message.send('Oh! Nice Picture :)');
      }

      const serverPrefix = await this.main.prefixHelper.getServerPrefix(message.guild.id);

      if (!inputCommand) {
        return message.send(`Yes? <@${this.main.api.user.id}> help or \`${serverPrefix}help\``);
      }

      if (inputCommand.startsWith(serverPrefix)) {
        return message.send(`You don't need \`${serverPrefix}\` in mentioned messages. Try without.`);
      }

      if (inputCommand.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        return message.send(`You don't need \`${this.main.prefixHelper.getDefaultPrefix()}\` in mentioned messages. Try without.`);
      }

      inputCommandParamString = message.content.substring(msgArr[0].length + 2 + inputCommand.length);
    } else { // regular call with bot prefix
      const serverPrefix = await this.main.prefixHelper.getServerPrefix(message.guild.id);

      inputCommand = message.content.split(' ')[0].substring(serverPrefix.length);
      inputCommandParamString = message.content.substring(inputCommand.length + serverPrefix.length + 1);

      if (!inputCommand) {
        winston.debug('No command supplied... returning');
        return false;
      }
    }

    inputCommand = inputCommand.toLowerCase();

    if (!this.main.commands[inputCommand] && !this.main.aliases[inputCommand]) {
      let output = 'Unknown command.';

      const related = this.main.utils.findRelated(inputCommand);

      if (related) {
        output += ` Did you mean \`${related}\`?`;
      }

      return message.send(output);

      // if (editMessage && editMessage.deletable) {
      //   editMessage.delete();
      //   message.replies = [];
      // }
      //
      // return false;
    }

    if (!this.main.commands[inputCommand]) {
      winston.debug('Input command %s is an alias for command %s', inputCommand, this.main.aliases[inputCommand]);
      inputCommand = this.main.aliases[inputCommand];
    }

    if (this.main.commands[inputCommand].owner && !this.main.utils.isBotAdmin(message)) {
      return message.send('Sorry, but only bot administrators can run this command.');
    }

    if ((this.main.commands[inputCommand].admin || this.main.commands[inputCommand].noDM) && this.isDM(message)) {
      return message.send('Sorry, but this command can\'t be executed via DM.');
    }

    if (this.main.commands[inputCommand].admin && !this.main.utils.isGuildAdmin(message)) {
      return message.send('Sorry, but only server administrators can run this command.');
    }

    let inputCommandParams;

    inputCommandParams = inputCommandParamString.trim().split('');

    const args = [];
    let inMultiwordArg = false;
    let currentArg = '';

    for (const char of inputCommandParams) {
      if (char === '"') {
        inMultiwordArg = !inMultiwordArg;
      } else if (char === ' ' && !inMultiwordArg && currentArg) {
        args.push(currentArg);
        currentArg = '';
      } else if (char !== ' ' || inMultiwordArg) currentArg += char;
    }

    if (currentArg) args.push(currentArg);

    inputCommandParams = args;

    if (this.getParamCount(inputCommand) <= 1) {
      inputCommandParams = inputCommandParams.join(' ');
    }

    // if (commandParamCount < inputCommandParamString.length) {
    //   winston.debug('User supplied more args than needed. Appending those...');
    //
    //   for (let i = commandParamCount; i < inputCommandParamString.length; i += 1) {
    //     inputCommandParamString[commandParamCount - 1] += ` ${inputCommandParamString[i]}`;
    //   }
    // }

    if (this.main.commands[inputCommand].args
      && this.main.commands[inputCommand].args.length >= 1
      && inputCommandParams.length < this.main.commands[inputCommand].args.length) {
      return message.send(this.main.utils.argumentsError(inputCommand, inputCommandParams.length, 'Arguments missing'));
    }

    const redisResult = await this.main.redis.get(`cooldown:${message.author.id}:${inputCommand}`);

    if (this.main.utils.isBotAdmin(message) || !redisResult) {
      this.handleCommand(message, inputCommand, inputCommandParams);
      if (this.main.commands[inputCommand].cooldown !== 0) {
        this.main.redis.set(`cooldown:${message.author.id}:${inputCommand}`, true, 'EX', this.main.commands[inputCommand].cooldown || 10);
      }
      return;
    }

    const commandCooldown = await this.main.redis.pttl(`cooldown:${message.author.id}:${inputCommand}`);
    return message.send(`Cooldown! Please wait another ${Math.round(commandCooldown / 100) / 10} seconds before executing \`${inputCommand}\` again.`);
  }

  async handleMessageEvent(message) {
    const shouldHandle = await this.shouldHandle(message);

    winston.debug('New message event fired. ID: %s - shouldHandle? %s -- %s', message.id, shouldHandle, message.content);

    if (shouldHandle) {
      this.handleMessage(message);
    }
  }

  async handleMessageUpdateEvent(oldMessage, newMessage) {
    const shouldHandle = await this.shouldHandle(newMessage);

    winston.debug('Message edit event fired. ID: %s - hasReplies? %s - shouldHandle (new message)? %s -- %s <-> %s', newMessage.id, !!oldMessage.replies, shouldHandle, oldMessage.content, newMessage.content);

    if (!oldMessage.content || !newMessage.content || oldMessage.content === newMessage.content) {
      winston.debug('Message content did not change... returning');
      return;
    }

    if (oldMessage.responded) {
      if (shouldHandle) {
        if (oldMessage.replies.length === 1) {
          winston.debug('Editing old response...');
          this.handleMessage(newMessage, oldMessage.replies[0]);
          return;
        } else if (oldMessage.replies.length > 1) {
          winston.debug('Deleting old responses and sending new messages...');

          for (const msg of oldMessage.replies) {
            if (msg.deletable) {
              msg.delete(0);
            }
          }

          newMessage.replies = [];
        } else {
          winston.debug('Message has no responses so far...');
        }

        this.handleMessage(newMessage);
        return;
      }

      winston.debug('Deleting all answers...');

      for (const msg of oldMessage.replies) {
        if (msg.deletable) {
          msg.delete(0);
        }
      }

      newMessage.replies = [];
      newMessage.responded = false;

      return;
    }

    if (shouldHandle) {
      this.handleMessage(newMessage);
    }
  }

  async handleMessageDeleteEvent(message) {
    winston.debug('Message delete event fired. was answered by me?', message.responded);
    if (!message.responded) {
      return;
    }

    winston.debug('Has replies from me?', (message.replies && message.replies.count > 0));
    if (!message.replies) {
      return;
    }

    message.wasDeleted = true;

    for (const reply of message.replies) {
      if (reply.deletable) {
        reply.delete(0);
      }
    }

    message.replies = [];
  }
}

module.exports = CommandHandler;

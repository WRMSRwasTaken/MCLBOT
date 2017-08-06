const winston = require('winston');

class CommandHandler {
  constructor(main) {
    this.main = main;
  }

  isMyMessage(message) {
    return message.author.id === this.main.api.user.id;
  }

  isDM(message) {
    return message.channel.type === 'dm';
  }

  hasAttachments(message) {
    return !!message.attachments.first();
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

  async handleMessageDeleteEvent(message) {
    if (message.author.bot) {
      return;
    }

    winston.debug('Message delete event fired. was answered by me?', !!message.responded);
    if (!message.responded) {
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

  async messageSendFunction(message, args, messageToEdit = false) {
    if (message.wasDeleted) {
      return false;
    }

    let newMessage;

    try {
      if (messageToEdit) {
        newMessage = await messageToEdit.edit(...args);
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

    this.main.prometheusMetrics.commandContGauge.inc();

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

  async handleMessageEvent(message, editedMessage) {
    const messageToHandle = editedMessage || message;

    if (messageToHandle.author.bot || messageToHandle.pinned) {
      return false;
    }

    let oldMessage;

    const mentionExec = this.main.mentionRegex.exec(messageToHandle.content);
    const mentionLength = (mentionExec && mentionExec[0].length) || 0;
    const isMention = !!mentionLength;
    const isDM = (messageToHandle.channel.type === 'dm');

    let serverPrefix;

    if (!isMention && !isDM) {
      serverPrefix = await this.main.prefixHelper.getServerPrefix(messageToHandle.guild.id);
    }

    if (!messageToHandle.content.startsWith(serverPrefix) && !isMention && !isDM) {
      if (editedMessage && message.responded) {
        // old message was responded, but the new shouldn't be handled
        winston.debug(`Old message responded to, new message should not, deleting ${message.replies.length} answer message(s)...`);

        for (const reply of message.replies) {
          if (reply && reply.deletable) {
            reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
          }
        }

        editedMessage.replies = [];
        editedMessage.responded = false;
      }

      return false;
    }

    if (editedMessage) {
      winston.debug('');
      winston.debug('Message edit event fired. ID: %s - hasReplies? %s -- %s <-> %s', editedMessage.id, !!message.replies, message.content, editedMessage.content);

      if (!message.content || !editedMessage.content || message.content === editedMessage.content) {
        winston.debug('Message content did not change... returning');
        return false;
      }

      if (message.responded) {
        // old message was responded, and the new should be too
        // if (message.replies.length > 1) {
        winston.debug(`Deleting ${message.replies.length} answer message(s) to send new messages...`);

        for (const reply of messageToHandle.replies) {
          if (reply && reply.deletable) {
            reply.delete().catch(() => winston.warn(`Cannot delete message id ${reply.id}, maybe it has already been deleted?`));
          }
        }

        editedMessage.replies = [];
        // } else {
        //   oldMessage = message.replies[0]; // set the message to edit by the handler
        // }
      }
    } else {
      winston.debug('');
      winston.debug('New message event fired. ID: %s -- %s', messageToHandle.id, messageToHandle.content);
    }

    let inputCommand;
    let inputCommandParamString;

    // global user blacklist (blacklists given user id on all servers & DM - bot admin only)
    winston.debug(`Checking global blacklist status for user id ${messageToHandle.author.id}`);

    const globalBlacklistResult = await this.main.blacklistHelper.getGlobalBlacklist(messageToHandle.author.id);

    if (globalBlacklistResult) {
      winston.debug(`User id ${messageToHandle.author.id} has been globally blacklisted! Returning`);
      return false;
    }
    winston.debug(`User id ${messageToHandle.author.id} is not globally blacklisted`);

    if (!this.isDM(messageToHandle)) {
      // global server blacklist (blacklists given server id - bot admin only)
      // TODO

      // per-server user blacklist (blacklists given user id on the given server id - server admin only)
      winston.debug(`Checking user blacklist status for user id ${messageToHandle.author.id} on server id ${messageToHandle.guild.id}`);

      const userBlacklistResult = await this.main.blacklistHelper.getUserBlacklist(messageToHandle.author.id, messageToHandle.guild.id);

      if (userBlacklistResult) {
        winston.debug(`User id ${messageToHandle.author.id} has been blacklisted on server id ${messageToHandle.guild.id}! Returning`);
        return false;
      }
      winston.debug(`User id ${messageToHandle.author.id} is not blacklisted on server id ${messageToHandle.guild.id}`);

      // per-server channel blacklist (blacklists given channel id on the given server id - server admin only)
      winston.debug(`Checking channel blacklist status for channel id ${messageToHandle.channel.id} on server id ${messageToHandle.guild.id}`);

      const channelBlacklistResult = await this.main.blacklistHelper.getChannelBlacklist(messageToHandle.channel.id, messageToHandle.guild.id);

      if (channelBlacklistResult) {
        winston.debug(`Channel id ${messageToHandle.channel.id} has been blacklisted on server id ${messageToHandle.guild.id}! Returning`);
        return false;
      }
      winston.debug(`Channel id ${messageToHandle.channel.id} is not blacklisted on server id ${messageToHandle.guild.id}`);
    } else {
      winston.debug('DM received, skipping user, channel and server blacklist check!');
    }

    messageToHandle.responded = true;
    messageToHandle.replies = messageToHandle.replies || [];

    messageToHandle._send = messageToHandle.send;

    messageToHandle.send = async (...args) => {
      // if (oldMessage && typeof args[0] === 'string' && args[0] === oldMessage.content) {
      //   winston.debug('My edit would be the same message... returning the replied message object');
      //   return oldMessage; // We must return the message object to allow further edits
      // }

      return this.messageSendFunction(messageToHandle, args, oldMessage);
    };

    if (messageToHandle.guild && !messageToHandle.channel.permissionsFor(messageToHandle.guild.me).has('SEND_MESSAGES')) {
      return messageToHandle.author.send('`SEND_MESSAGES` permission missing for this channel!');
    }

    if (messageToHandle.guild && !messageToHandle.channel.permissionsFor(messageToHandle.guild.me).has('ATTACH_FILES')) {
      return messageToHandle.channel.send('`ATTACH_FILES` permission missing for this channel!');
    }

    if (isDM) { // direct message channel
      inputCommand = messageToHandle.content.split(' ')[0];
      inputCommandParamString = messageToHandle.content.substring(inputCommand.length + 1);

      if (!inputCommand && this.hasAttachments(messageToHandle)) {
        return messageToHandle.send('Oh! Nice Picture :)');
      }

      if (messageToHandle.content.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        return messageToHandle.send(`You don't need \`${this.main.prefixHelper.getDefaultPrefix()}\` in private messages. Try without.`);
      }
    } else if (isMention) { // mention
      const messageWithoutMention = messageToHandle.content.substring(mentionLength).trim();

      inputCommand = messageWithoutMention.split(' ')[0];
      inputCommandParamString = messageWithoutMention.substring(inputCommand.length + 1);

      if (!inputCommand && this.hasAttachments(messageToHandle)) {
        return messageToHandle.send('Oh! Nice Picture :)');
      }

      const serverPrefixForMention = await this.main.prefixHelper.getServerPrefix(messageToHandle.guild.id);

      if (!inputCommand) {
        return messageToHandle.send(`Yes? <@${this.main.api.user.id}> help or \`${serverPrefixForMention}help\``);
      }

      if (inputCommand.startsWith(serverPrefixForMention)) {
        return messageToHandle.send(`You don't need \`${serverPrefixForMention}\` in mentioned messages. Try without.`);
      }

      if (inputCommand.startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        return messageToHandle.send(`You don't need \`${this.main.prefixHelper.getDefaultPrefix()}\` in mentioned messages. Try without.`);
      }
    } else { // regular call with bot prefix
      const messageWithoutPrefix = messageToHandle.content.substring(serverPrefix.length).trim();

      inputCommand = messageWithoutPrefix.split(' ')[0];
      inputCommandParamString = messageWithoutPrefix.substring(inputCommand.length + 1);

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
      } else if (!related && isDM) {
        output += ' (Maybe try commands without any prefixes?)';
      }

      return messageToHandle.send(output);
    }

    if (!this.main.commands[inputCommand]) {
      winston.debug('Input command %s is an alias for command %s', inputCommand, this.main.aliases[inputCommand]);
      inputCommand = this.main.aliases[inputCommand];
    }

    if (this.main.commands[inputCommand].owner && !this.main.utils.isBotAdmin(messageToHandle)) {
      return messageToHandle.send('Sorry, but only bot administrators can run this command.');
    }

    if ((this.main.commands[inputCommand].admin || this.main.commands[inputCommand].noDM) && this.isDM(messageToHandle)) {
      return messageToHandle.send('Sorry, but this command can\'t be executed via DM.');
    }

    if (this.main.commands[inputCommand].admin && !this.main.utils.isGuildAdmin(messageToHandle)) {
      return messageToHandle.send('Sorry, but only server administrators can run this command.');
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

    const commandParamCount = this.getParamCount(inputCommand);

    if (commandParamCount <= 1) {
      inputCommandParams = inputCommandParams.join(' ');
    } else if (commandParamCount < inputCommandParams.length) {
      winston.debug('User supplied more args than needed. Appending those...');

      for (let i = commandParamCount; i < inputCommandParams.length; i += 1) {
        inputCommandParams[commandParamCount - 1] += ` ${inputCommandParams[i]}`;
      }
    }

    if (this.main.commands[inputCommand].args
      && this.main.commands[inputCommand].args.length >= 1
      && inputCommandParams.length < this.main.commands[inputCommand].args.length) {
      return messageToHandle.send(this.main.utils.argumentsError(inputCommand, inputCommandParams.length, 'Arguments missing'));
    }

    const redisResult = await this.main.redis.get(`cooldown:${messageToHandle.author.id}:${inputCommand}`);

    if (this.main.utils.isBotAdmin(messageToHandle) || !redisResult) {
      this.handleCommand(messageToHandle, inputCommand, inputCommandParams);
      if (this.main.commands[inputCommand].cooldown !== 0) {
        this.main.redis.set(`cooldown:${messageToHandle.author.id}:${inputCommand}`, 1, 'EX', this.main.commands[inputCommand].cooldown || 10);
      }
      return false;
    }

    if (redisResult === '2') {
      return false;
    }

    this.main.redis.incr(`cooldown:${messageToHandle.author.id}:${inputCommand}`);

    const commandCooldown = await this.main.redis.pttl(`cooldown:${messageToHandle.author.id}:${inputCommand}`);
    return messageToHandle.send(`Cooldown! Please wait another ${Math.round(commandCooldown / 100) / 10} seconds before executing \`${inputCommand}\` again.`);
  }
}

module.exports = CommandHandler;

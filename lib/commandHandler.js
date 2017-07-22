const winston = require('winston');
const nconf = require('nconf');
const moment = require('moment');


class CommandHandler {
  constructor(main) {
    this.main = main;
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

  async sendFunction(message, text, editMessage = false) {
    if (message.wasDeleted) {
      return false;
    }

    let newMessage;

    try {
      if (editMessage) {
        newMessage = await editMessage.edit(text);
      } else {
        newMessage = await message.channel.send(text);
        message.replies.push(newMessage);
      }
    } catch (err) {
      winston.error('Error sending response:', err.message);
      newMessage = await message.send('Ooops! I encountered an error while sending the command output.');
    }

    return newMessage;
  }

  async handleCommand(message, inputCommand, inputCommandParams) {
    if (this.main.utils.isDM(message)) {
      winston.info(`${inputCommand} by ${message.author.tag} (${message.author.id}) (DM)`);
    } else {
      winston.info(`${inputCommand} by ${message.author.tag} (${message.author.id}) in channel #${message.channel.name} (${message.channel.id}) on server ${message.channel.guild.name} (${message.channel.guild.id})`);
    }

    // if (nconf.get('bot:logchannel')) {
    //   const embed = new main.Discord.RichEmbed();
    //
    //   embed.title = inputCommand;
    //
    //   if (main.bot.shard) {
    //     embed.description = `Shard ID: ${main.bot.shard.id}`;
    //   } else {
    //     embed.description = 'No shard';
    //   }
    //
    //   embed.author = {
    //     name: `${message.author.tag} (${message.author.id})`,
    //     icon_url: message.author.avatarURL,
    //   };
    //
    //   embed.addField('Server', (main.isPM(message)) ? 'DM' : `${message.channel.guild.name} (${message.channel.guild.id})`);
    //   embed.addField('Channel', (main.isPM(message)) ? 'DM' : `#${message.channel.name} (${message.channel.id})`);
    //   embed.addField('Message', `${inputCommand},${inputCommandParams.toString()}`);
    //   embed.timestamp = moment((message.editedTimestamp) ? message.editedTimestamp : message.createdTimestamp).toDate();
    //
    //   try {
    //     main.bot.channels.get(nconf.get('bot:logchannel')).send({
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
        winston.debug('Command output was a string, passing manually to replyFunction()...');

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

    message.responded = true;
    message.replies = message.replies || [];

    message._send = message.send;

    message.send = async (text) => {
      if (editMessage && text === editMessage.content) { // We must return the message object to allow further edits
        winston.debug('My edit would be the same message...');
        return editMessage;
      }

      return this.sendFunction.call(null, message, text, editMessage);
    };

    if (message.guild && !message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) {
      return message.author.send('`SEND_MESSAGES` permission missing for this channel!');
    }

    if (message.guild && !message.channel.permissionsFor(message.guild.me).has('ATTACH_FILES')) {
      return message.channel.send('`ATTACH_FILES` permission missing for this channel!');
    }


    if (this.main.utils.isDM(message)) { // direct message channel
      inputCommand = message.content.split(' ')[0];
      inputCommandParamString = message.content.substring(inputCommand.length + 1);

      if (!inputCommand && this.main.utils.hasAttachments(message)) {
        return message.send('Oh! Nice Picture :)');
      }

      if (message.content.trim().startsWith(this.main.prefixHelper.getDefaultPrefix())) {
        return message.send(`You don't need \`${this.main.prefixHelper.getDefaultPrefix()}\` in private messages. Try without.`);
      }
    } else if (this.main.utils.isMention(message)) { // mention
      const msgArr = message.content.split(' ');
      inputCommand = msgArr[1];

      if (!inputCommand && this.main.utils.hasAttachments(message)) {
        return message.send('Oh! Nice Picture :)');
      }

      const serverPrefix = await this.main.prefixHelper.getServerPrefix(message.guild.id);

      if (!inputCommand) {
        return message.send(`Yes? <@${this.main.bot.user.id}> help or \`${serverPrefix}help\``);
      }

      if (inputCommand.startsWith(serverPrefix)) {
        return message.send(`You don't need \`${serverPrefix}\` in mentioned messages. Try without.`);
      }

      inputCommandParamString = message.content.substring(msgArr[0].length + 2 + inputCommand.length);
    } else { // regular call with bot prefix
      inputCommand = message.content.split(' ')[0].substring(nconf.get('bot:prefix').length);
      inputCommandParamString = message.content.substring(inputCommand.length + nconf.get('bot:prefix').length + 1);

      if (!inputCommand) {
        return false;
      }
    }

    inputCommand = inputCommand.toLowerCase();

    if (!this.main.commands[inputCommand] && !this.main.aliases[inputCommand]) {
      // let output = 'Unknown command.';
      //
      // const related = this.main.utils.findRelated(inputCommand);
      //
      // if (related) {
      //   output += ` Did you mean \`${related}\`?`;
      // }
      //
      // message.send(output);

      if (editMessage && editMessage.deletable) {
        editMessage.delete();
        message.replies = [];
      }

      return false;
    }

    if (!this.main.commands[inputCommand]) {
      winston.debug('Input command %s is an alias for command %s', inputCommand, this.main.aliases[inputCommand]);
      inputCommand = this.main.aliases[inputCommand];
    }

    if (this.main.commands[inputCommand].owner && !this.main.owner.includes(message.author.id)) {
      return message.send('Sorry, but only bot administrators can run this command.');
    }

    if (this.main.commands[inputCommand].admin && !message.member.hasPermission('MANAGE_GUILD')) {
      return message.send('Sorry, but only server administrators can run this command.');
    }

    // if (inputCommand === 'help') {
    //   return this.handleCommand(message, inputCommand, inputCommandParamString);
    // }

    let inputCommandParams;

    if (this.getParamCount(inputCommand) > 1) {
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
    } else {
      inputCommandParams = inputCommandParamString;
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

    if (this.main.owner.includes(message.author.id) || !redisResult) {
      this.handleCommand(message, inputCommand, inputCommandParams);
      if (this.main.commands[inputCommand].cooldown !== undefined) {
        this.main.redis.set(`cooldown:${message.author.id}:${inputCommand}`, true, 'EX', this.main.commands[inputCommand].cooldown || 10);
      }
      return;
    }

    const commandCooldown = await this.main.redis.pttl(`cooldown:${message.author.id}:${inputCommand}`);
    return message.send(`Cooldown! Please wait another ${Math.round(commandCooldown / 100) / 10} seconds before executing \`${inputCommand}\` again.`);
  }
}

module.exports = CommandHandler;

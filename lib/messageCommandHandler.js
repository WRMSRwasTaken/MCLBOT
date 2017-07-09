const winston = require('winston');
const nconf = require('nconf');
const moment = require('moment');

module.exports = ((main) => {
  function replyText(message, text, mention = true, editMessage = false) {
    if (message.wasDeleted) {
      return false;
    }

    let promise;

    if (editMessage) {
      promise = editMessage.edit(`${(message.channel.type !== 'dm') ? `<@${message.author.id}>, ` : ''}${text}`);
    } else if (!main.isPM(message) && mention) {
      promise = message.reply(text);
    } else {
      promise = message.channel.send(text);
    }

    promise
      .then((newMessage) => {
        if (!editMessage) {
          message.replies.push(newMessage);
        }
      })
      .catch((err) => {
        winston.error('Error sending response:', err.message);
        message.replyFunction('Ooops! I encountered an error while sending the command output.');
      });

    return promise;
  }

  function getParamCount(command) {
    const commandParams = main.commands[command].args;
    const commandOptionalParams = main.commands[command].optArgs;

    let paramCount = 0;

    if (commandParams && typeof commandParams === 'object' && commandParams.length > 1) {
      paramCount += commandParams.length;
    }

    if (commandOptionalParams && typeof commandOptionalParams === 'object' && commandOptionalParams.length > 1) {
      paramCount += commandOptionalParams.length;
    }

    return paramCount;
  }

  function hasParamsMissing(command, params) {
    const commandParams = main.commands[command].args;

    if (!commandParams) {
      return false;
    }

    if (!params) {
      return true;
    }

    if (typeof commandParams === 'object' && typeof params === 'object' && params.length < commandParams.length) {
      return true;
    }

    return false;
  }

  function handleCommand(message, inputCommand, inputCommandParams) {
    if (main.isPM(message)) {
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
      const output = main.commands[inputCommand].fn(message, inputCommandParams, main);

      if (typeof output === 'string') {
        winston.debug('Command output was a string, passing manually to replyFunction()...');

        message.replyFunction(output);
      }
    } catch (err) {
      winston.error('Error executing command:', inputCommand, inputCommandParams, err.message);
      message.replyFunction('Ooops! I encountered an error while executing your command.');
    }
  }

  const handler = {};

  handler.handleMessage = (message, editMessage) => {
    let inputCommand;
    let inputCommandParams;

    message.responded = true;
    message.replies = message.replies || [];

    message.replyFunction = (text, mention) => {
      if (editMessage && text === editMessage.content) { // We must return the message object to allow further edits
        winston.debug('My edit would be the same message...');
      }

      const ret = replyText.call(null, message, text, mention, editMessage);

      return ret;
    };

    // message.replyFunction = (...args) => replyText.call(null, message, args);

    if (!main.isPM(message) && !message.guild.members.get(main.bot.user.id).hasPermission('SEND_MESSAGES')) {
      message.author.send('Sorry, but I don\'t have permission to post in that channel!');
      return;
    }

    if (main.isPM(message)) {
      inputCommand = message.content.split(' ')[0];
      inputCommandParams = message.content.substring(inputCommand.length + 1);

      if (!inputCommand && main.hasAttachments(message)) {
        message.replyFunction('Oh! Nice Picture :)');
        return;
      }

      if (inputCommand.startsWith(nconf.get('bot:prefix'))) {
        message.replyFunction(`You don't need '${nconf.get('bot:prefix')}' in private messages. Try without.`);
        return;
      }
    } else if (main.isMention(message)) {
      const msgArr = message.content.split(' ');
      inputCommand = msgArr[1];

      if (!inputCommand && main.hasAttachments(message)) {
        message.replyFunction('Oh! Nice Picture :)');
        return;
      }

      if (!inputCommand) {
        message.replyFunction(`Yes? <@${main.bot.user.id}> help or \`${nconf.get('bot:prefix')}help\``);
        return;
      }

      if (inputCommand.startsWith(nconf.get('bot:prefix'))) {
        message.replyFunction(`You don't need '${nconf.get('bot:prefix')}' in mentioned messages. Try without.`);
        return;
      }

      inputCommandParams = message.content.substring(msgArr[0].length + 2 + inputCommand.length);
    } else {
      inputCommand = message.content.split(' ')[0].substring(nconf.get('bot:prefix').length);
      inputCommandParams = message.content.substring(inputCommand.length + nconf.get('bot:prefix').length + 1);

      if (!inputCommand) {
        return;
      }
    }

    inputCommand = inputCommand.toLowerCase();

    if (!main.commands[inputCommand] && !main.aliases[inputCommand]) {
      let output = 'Unknown command.';

      const related = main.utils.findRelated(inputCommand);

      if (related) {
        output += ` Did you mean \`${related}\`?`;
      }

      message.replyFunction(output);

      return;
    }

    if (!main.commands[inputCommand]) {
      winston.debug('Input command %s is an alias for command %s', inputCommand, main.aliases[inputCommand]);
      inputCommand = main.aliases[inputCommand];
    }

    if (main.commands[inputCommand].owner && !main.owner.includes(message.author.id)) {
      message.replyFunction('You don\'t have permission to execute this command');
      return;
    }

    if (inputCommand === 'help') {
      handleCommand(message, inputCommand, inputCommandParams);
      return;
    }

    const commandParamCount = getParamCount(inputCommand);

    if (commandParamCount > 1 && inputCommandParams) {
      winston.debug('Command %s has more than one argument: %d', inputCommand, commandParamCount);

      inputCommandParams = inputCommandParams.split(' ');

      winston.debug('Length of parameter array', inputCommandParams.length);
      winston.debug('Length of supplied parameter array:', commandParamCount);

      if (commandParamCount < inputCommandParams.length) {
        winston.debug('User supplied more args than needed. Appending those...');

        for (let i = commandParamCount; i < inputCommandParams.length; i += 1) {
          inputCommandParams[commandParamCount - 1] += ` ${inputCommandParams[i]}`;
        }
      }

      winston.debug('New inputCommandParams:', inputCommandParams);
    }

    if (hasParamsMissing(inputCommand, inputCommandParams)) {
      message.replyFunction(main.utils.argumentsError(inputCommand, inputCommandParams.length, 'Arguments missing'));
      return;
    }

    main.redis.get(`cooldown:${message.author.id}:${inputCommand}`)
      .then((redisResult) => {
        if (!redisResult) {
          handleCommand(message, inputCommand, inputCommandParams);
          return main.redis.set(`cooldown:${message.author.id}:${inputCommand}`, true, 'EX', 120);
        }

        return main.redis.pttl(`cooldown:${message.author.id}:${inputCommand}`)
          .then((cooldown) => {
            message.replyFunction(`Cooldown! Please wait another ${Math.round(cooldown / 100) / 10} seconds before executing \`${inputCommand}\` again.`);
          });
      });
  };

  return handler;
});

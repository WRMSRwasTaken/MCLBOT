const fs = require('fs');
const path = require('path');
const winston = require('winston');
const _ = require('lodash');

module.exports = ((mainObject) => {
  mainObject.commands = {};
  mainObject.aliases = {};

  mainObject.loadedCommands = 0;
  mainObject.loadedAliases = 0;
  mainObject.commandFilesCount = 0;

  mainObject.commands.help = {
    name: 'help',
    hide: true,
    alias: ['h', 'commands'],
    args: ['command'],
    desc: 'displays help',
    fn: (message, params, main) => {
      const tryParsedNumber = parseInt(params, 10);

      if (!params) {
        const output = main.utils.displayHelpPage();

        if (!mainObject.isPM(message)) {
          message.author.send(output);
          return 'I\'ve sent you a PM';
        }

        return output;
      } else if (!isNaN(tryParsedNumber)) {
        const output = main.utils.displayHelpPage(tryParsedNumber);

        if (!mainObject.isPM(message)) {
          message.author.send(output);
          return 'I\'ve sent you a PM';
        }

        return output;
      } else if (main.commands[params]) {
        return `Help for command ${params}: ${main.utils.displayCommandHelp(params)}`;
      }
      return 'Help for unknown command requested.';
    },
  };

  mainObject.commands.alias = {
    name: 'alias',
    hide: true,
    args: ['command'],
    desc: 'lists a command\'s aliases',
    fn: (message, params, main) => {
      winston.debug(params);

      if (params && main.commands[params]) {
        message.channel.send(`Aliases for command ${params}:\`\`\`${main.utils.listAliasesString(params)}\`\`\``);
      } else {
        message.channel.send('Aliases for unknown command requested.');
      }
    },
  };

  function addCommandAlias(commandName, newAliases) {
    _.forEach(newAliases, (newAlias) => {
      if (typeof newAlias !== 'string') {
        winston.warn('Not adding alias for command: %s, not a string!', newAlias, commandName);
        return;
      }

      if (mainObject.commands[newAlias]) {
        winston.warn('Not adding alias command: %s for command: %s, command already exists!', newAlias, commandName);
        return;
      }

      if (mainObject.aliases[newAlias]) {
        winston.warn('Not adding alias command: %s for command: %s, alias already exists!', newAlias, commandName);
        return;
      }

      mainObject.aliases[newAlias] = commandName;
      mainObject.loadedAliases += 1;
      winston.debug('Added alias %s for command %s', newAlias, commandName);
    });
  }

  function loadCommands(newCommands) {
    _.forEach(newCommands, (newCommand) => {
      if (!newCommand.name || typeof newCommand.name !== 'string') {
        winston.error('The "name" property of an imported object MUST be a string!');
        return;
      }

      if (newCommand.alias && !Array.isArray(newCommand.alias)) {
        winston.error('Not adding command: %s, the "alias" property of an imported object MUST be an array!', newCommand.name);
        return;
      }

      if (!newCommand.fn || typeof newCommand.fn !== 'function') {
        winston.error('Not adding command: %s, the "fn" property of an imported object MUST be a function!', newCommand.name);
        return;
      }

      if (newCommand.desc && typeof newCommand.desc !== 'string') {
        winston.error('Not adding command: %s, the "desc" property of an imported object MUST be a string!', newCommand.name);
        return;
      }

      if (mainObject.commands[newCommand.name]) {
        winston.warn('Not adding command: %s, command already exists!', newCommand.name);
        return;
      }

      if (mainObject.aliases[newCommand.name]) {
        winston.warn('Command: %s overwrites alias from command: %s', newCommand.name, mainObject.aliases[newCommand.name]);
        delete mainObject.aliases[newCommand.name];
        mainObject.loadedAliases -= 1;
      }

      mainObject.commands[newCommand.name] = newCommand;
      winston.debug('Bot command loaded:', newCommand.name);
      mainObject.loadedCommands += 1;

      if (newCommand.alias) {
        addCommandAlias(newCommand.name, newCommand.alias);
      }
    });
  }

  const funcs = {};

  funcs.loadCommandFiles = () => {
    fs
      .readdirSync(path.resolve(__dirname, '../commands'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach((file) => {
        try {
          winston.debug('Loading command file:', path.resolve(__dirname, '../commands', file));
          const commandFile = require(path.resolve(__dirname, '../commands', file));
          loadCommands(commandFile);
          mainObject.commandFilesCount += 1;
        } catch (err) {
          winston.error('Could not load file:', path.resolve(__dirname, '../commands', file), err);
        }
      });

    winston.debug('Sorting commands alphabetically...');

    let sorted = {},
      key,
      a = [];

    _.forEach(mainObject.commands, (commandValue, commandKey) => {
      a.push(commandKey);
    });

    a.sort();

    for (key = 0; key < a.length; key++) {
      sorted[a[key]] = mainObject.commands[a[key]];
    }

    mainObject.commands = sorted;

    winston.info(`Loaded ${mainObject.loadedCommands} bot commands with ${mainObject.loadedAliases} aliases from ${mainObject.commandFilesCount} files.`);

    winston.debug('Generating help pages...');

    let iterate = 0;
    let helpPageCount = 1;

    mainObject.helpPages = [];

    let output = '';

    _.forEach(mainObject.commands, (command) => {
      if (command.hide) {
        return;
      }

      output += ` - ${command.name}${(command.alias) ? ` (aliases are: ${command.alias.join(', ')})` : ''}`;
      if (command.desc) {
        output += `\n     --- ${command.desc}\n`;
      }

      mainObject.helpPages[helpPageCount - 1] = output;

      iterate += 1;

      if (iterate >= 10) {
        helpPageCount += 1;
        iterate = 0;
        output = '';
      }
    });
  };

  return funcs;
});

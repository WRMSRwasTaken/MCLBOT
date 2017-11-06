const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const _ = require('lodash');
const nconf = require('nconf');

class ResourceLoader {
  constructor(main) {
    this.main = main;

    this.main.commands = {};
    this.main.aliases = {};
    this.main.categories = {};
    this.main.events = {};
    this.main.types = {};
  }

  generateHelpPages() {
    winston.debug('Sorting commands alphabetically...');

    let sorted = {},
      key,
      a = [];

    _.forEach(this.main.commands, (commandValue, commandKey) => {
      a.push(commandKey);
    });

    a.sort();

    for (key = 0; key < a.length; key++) {
      sorted[a[key]] = this.main.commands[a[key]];
    }

    this.main.commands = sorted;

    winston.debug('Generating help pages...');

    let iterate = 0;
    let helpPageCount = 1;

    this.main.helpPages = [];

    let output = '';

    _.forEach(this.main.commands, (command) => {
      if (command.hide) {
        return;
      }

      output += ` - ${command.name}${(command.alias) ? ` (aliases are: ${command.alias.join(', ')})` : ''}`;
      if (command.desc) {
        output += `\n     --- ${command.desc}\n`;
      }

      this.main.helpPages[helpPageCount - 1] = output;

      iterate += 1;

      if (iterate >= 10) {
        helpPageCount += 1;
        iterate = 0;
        output = '';
      }
    });
  }

  reloadCategory(category) {
    if (category && !this.main.categories[category]) {
      throw new Error('Category does not exist!');
    }

    _.forEach(this.main.categories[category], (command) => {
      this.loadCommand(command, category, true);
    });
  }

  reloadAllCommands() {
    _.forEach(this.main.commands, (command) => {
      this.loadCommand(command.name, null, true);
    });
  }

  loadCommandFiles(category) {
    const dirName = `./commands${(category) ? `/${category}` : ''}`;
    winston.debug('Scanning directory for command files:', dirName);

    for (const file of fs.readdirSync(dirName)) {
      if (fs.statSync(path.resolve(dirName, file)).isDirectory()) {
        if (category) {
          winston.warn('Ignoring folder %s in command category folder %s!', file, category);
        } else {
          winston.debug('Going to load files for category:', file);
          this.loadCommandFiles(file);
        }
      } else {
        this.loadCommand(file.substring(0, file.lastIndexOf('.')).toLowerCase(), category);
      }
    }
  }

  validateCommand(commandObject, isSubCommand = false) {
    if (commandObject.alias && !Array.isArray(commandObject.alias)) {
      throw new Error('The "alias" property of an imported object MUST be none or an array');
    }

    if (isSubCommand) {
      if (!commandObject.fn || typeof commandObject.fn !== 'function') {
        throw new Error('The "fn" property of an imported object MUST be a function');
      }

      if (!commandObject.desc || typeof commandObject.desc !== 'string') {
        throw new Error('The "desc" property of an imported object MUST be a string');
      }
    } else {
      if (commandObject.fn && typeof commandObject.fn !== 'function') {
        throw new Error('The "fn" property of an imported object MUST be none or a function');
      }

      if (commandObject.fn && (!commandObject.desc || typeof commandObject.desc !== 'string')) {
        throw new Error('The "desc" property of an imported object MUST be a string');
      }
    }

    if (commandObject.arguments) {
      if (!Array.isArray(commandObject.arguments)) {
        throw new Error('The "arguments" property of an imported object MUST be none or an array');
      }

      _.forEach(commandObject.arguments, (argument) => {
        if (!this.main.types[argument.type]) {
          throw new Error('Unknown argument parser type!');
        }
      });
    }
  }

  loadCommand(commandName, commandCategory, reload = false) {
    let filePath;
    let newCommand;

    if (!reload) {
      if (commandCategory) {
        filePath = path.resolve('./commands', `${commandCategory}/${commandName}.js`);
      } else {
        filePath = path.resolve('./commands', `${commandName}.js`);
      }
    } else if (this.main.commands[commandName]) {
      filePath = this.main.commands[commandName].filePath;
    } else if (this.main.aliases[commandName]) {
      commandName = this.main.aliases[commandName];
      filePath = this.main.commands[commandName].filePath;
    } else {
      throw new Error('Unknown command specified for reloading!');
    }

    if (this.main.commands[commandName] && !reload) {
      throw new Error('Command name already exists. Try unloading it first.');
    }

    if (require.cache[require.resolve(filePath)]) {
      delete require.cache[require.resolve(filePath)];
    }

    try {
      fs.accessSync(filePath);
    } catch (ex) {
      winston.error('Command file cannot be found:', filePath);
      throw new Error('Command file cannot be found!');
    }

    try {
      newCommand = require(filePath);
    } catch (ex) {
      winston.error('Error loading command file:', ex.message);
      throw new Error('Error loading command file!');
    }

    if (!Object.keys(newCommand).length) {
      winston.warn('Skipping empty command file:', filePath);
      return;
    }

    newCommand.name = commandName;
    newCommand.category = commandCategory;
    newCommand.filePath = filePath;

    this.validateCommand(newCommand, false);

    if (newCommand.subcommands && typeof newCommand.subcommands !== 'object') {
      throw new Error('The "subcommands" property of an imported object MUST be an object');
    }

    if (!newCommand.fn && !newCommand.subcommands) {
      throw new Error('Command has no function and no subcommands');
    }

    if (newCommand.subcommands) {
      _.forEach(newCommand.subcommands, (subcommand, subcommandName) => {
        subcommand.name = subcommandName;

        this.validateCommand(subcommand, true);
      });
    }

    if (this.main.aliases[newCommand.name]) {
      winston.warn('Command: %s overwrites alias from command: %s', newCommand.name, this.main.aliases[newCommand.name]);
      delete this.main.aliases[newCommand.name];
    }

    this.main.categories[newCommand.category] = this.main.categories[newCommand.category] || {};
    if (newCommand.category) {
      this.main.categories[newCommand.category][newCommand.name] = newCommand.name;
    }

    if (reload && this.main.commands[commandName].alias) {
      _.forEach(this.main.commands[commandName].alias, (oldAlias) => {
        delete this.main.aliases[oldAlias];
      });
    }

    if (newCommand.alias) {
      _.forEach(newCommand.alias, (newAlias) => {
        if (typeof newAlias !== 'string') {
          winston.warn('Not adding alias for command: %s, not a string!', newAlias, newCommand.name);
          return;
        }

        if (this.main.commands[newAlias]) {
          winston.warn('Not adding alias command: %s for command: %s, command already exists!', newAlias, newCommand.name);
          return;
        }

        if (this.main.aliases[newAlias]) {
          winston.warn('Not adding alias command: %s for command: %s, alias already exists!', newAlias, newCommand.name);
          return;
        }

        this.main.aliases[newAlias] = newCommand.name;
        winston.debug('Added alias: %s -> %s', newAlias, newCommand.name);
      });
    }

    this.main.commands[newCommand.name] = newCommand;
    winston.debug('Bot command loaded:', newCommand.name);
  }

  loadEventFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../events'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach(file => this.loadEvent(file.substring(0, file.lastIndexOf('.'))));
  }

  loadEvent(eventName) {
    const filePath = path.resolve('./events', `${eventName}.js`);
    let newEvent;

    try {
      newEvent = require(filePath);
    } catch (ex) {
      winston.error('Error loading event file:', ex.message);
      throw new Error('Error loading event file!');
    }

    if (!Object.keys(newEvent).length) {
      winston.warn('Skipping empty event file:', filePath);
      return;
    }

    if (!newEvent.fn || typeof newEvent.fn !== 'function') {
      throw new Error('The "fn" property of an imported object MUST be a function');
    }

    this.main.api.on(eventName, (...args) => newEvent.fn.apply(null, [].concat(this.main, args)));
    winston.debug('Bot event loaded:', eventName);
  }

  executeTask(newTask, main) {
    if (newTask.noSelfbot && nconf.get('bot:selfbot')) {
      return;
    }

    if (!main.ready) {
      return;
    }

    winston.debug('Executing task:', newTask.name);
    newTask.fn.call(null, main);
  }

  loadTask(taskName) {
    const filePath = path.resolve('./tasks', `${taskName}.js`);
    let newTask;

    try {
      newTask = require(filePath);
    } catch (ex) {
      winston.error('Error loading task file:', ex.message);
      throw new Error('Error loading task file!');
    }

    if (!Object.keys(newTask).length) {
      winston.warn('Skipping empty task file:', filePath);
      return;
    }

    if (!newTask.fn || typeof newTask.fn !== 'function') {
      throw new Error('The "fn" property of an imported object MUST be a function');
    }

    if (!newTask.interval || typeof newTask.interval !== 'number') {
      throw new Error('The "interval" property of an imported object MUST be a number');
    }

    newTask.name = taskName;

    setInterval(this.executeTask.bind(null, newTask, this.main), newTask.interval * 1000);
    winston.debug('Bot task loaded:', taskName);
  }

  loadTaskFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../tasks'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach(file => this.loadTask(file.substring(0, file.lastIndexOf('.'))));
  }

  loadType(typeName) {
    const filePath = path.resolve('./types', `${typeName}.js`);
    let newType;

    try {
      newType = require(filePath);
    } catch (ex) {
      winston.error('Error loading type file:', ex.message);
      throw new Error('Error loading type file!');
    }

    if (!Object.keys(newType).length) {
      winston.warn('Skipping empty type file:', filePath);
      return;
    }

    if (!newType.parse || typeof newType.parse !== 'function') {
      throw new Error('The "parse" property of an imported object MUST be a function');
    }

    if (newType.default && typeof newType.default !== 'function') {
      throw new Error('The "default" property of an imported object MUST be a function');
    }

    newType.name = typeName;

    this.main.types[newType.name] = newType;
    winston.debug('Bot command parameter type loaded:', newType.name);
  }

  loadTypeFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../types'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach(file => this.loadType(file.substring(0, file.lastIndexOf('.'))));
  }
}

module.exports = ResourceLoader;

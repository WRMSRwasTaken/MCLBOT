const fs = require('fs');
const path = require('path');
const winston = require('winston');
const _ = require('lodash');

class ResourceLoader {
  constructor(main) {
    this.main = main;

    this.main.commands = {};
    this.main.aliases = {};

    this.main.loadedCommands = 0;
    this.main.loadedAliases = 0;
    this.main.loadedEvents = 0;
    this.main.loadedTasks = 0;
    this.main.commandFilesCount = 0;
    this.main.eventFilesCount = 0;
    this.main.taskFilesCount = 0;
  }

  addCommandAlias(commandName, newAliases) {
    _.forEach(newAliases, (newAlias) => {
      if (typeof newAlias !== 'string') {
        winston.warn('Not adding alias for command: %s, not a string!', newAlias, commandName);
        return;
      }

      if (this.main.commands[newAlias]) {
        winston.warn('Not adding alias command: %s for command: %s, command already exists!', newAlias, commandName);
        return;
      }

      if (this.main.aliases[newAlias]) {
        winston.warn('Not adding alias command: %s for command: %s, alias already exists!', newAlias, commandName);
        return;
      }

      this.main.aliases[newAlias] = commandName;
      this.main.loadedAliases += 1;
      winston.debug('Added alias %s for command %s', newAlias, commandName);
    });
  }

  loadCommand(newCommand) {
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

    if (this.main.commands[newCommand.name]) {
      winston.warn('Not adding command: %s, command already exists!', newCommand.name);
      return;
    }

    if (this.main.aliases[newCommand.name]) {
      winston.warn('Command: %s overwrites alias from command: %s', newCommand.name, this.main.aliases[newCommand.name]);
      delete this.main.aliases[newCommand.name];
      this.main.loadedAliases -= 1;
    }

    this.main.commands[newCommand.name] = newCommand;
    winston.debug('Bot command loaded:', newCommand.name);
    this.main.loadedCommands += 1;

    if (newCommand.alias) {
      this.addCommandAlias(newCommand.name, newCommand.alias);
    }
  }

  loadCommandFile(commandFile) {
    try {
      winston.debug('Loading command file:', path.resolve(__dirname, '../commands', commandFile));

      if (require.cache[path.resolve(__dirname, '../commands', commandFile)]) {
        delete require.cache[path.resolve(__dirname, '../commands', commandFile)];
      }

      const loadedCommandFile = require(path.resolve(__dirname, '../commands', commandFile));

      _.forEach(loadedCommandFile, newCommand => this.loadCommand(newCommand));

      this.main.commandFilesCount += 1;
    } catch (err) {
      winston.error('Could not load file:', path.resolve(__dirname, '../commands', commandFile), err);
    }
  }

  loadCommandFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../commands'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach(file => this.loadCommandFile(file));

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

    winston.info(`Loaded ${this.main.loadedCommands} bot commands with ${this.main.loadedAliases} aliases from ${this.main.commandFilesCount} files.`);

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

  loadEvent(newEvent) {
    if (typeof newEvent.on !== 'string') {
      winston.error('The "on" property of an imported object MUST be a string!');
      return;
    }

    if (!newEvent.fn || typeof newEvent.fn !== 'function') {
      winston.error('Not adding event: %s, the "fn" property of an imported object MUST be a function!', newEvent.on);
      return;
    }

    this.main.api.on(newEvent.on, (...args) => newEvent.fn.apply(null, [].concat(this.main, args)));
    winston.debug('Bot event loaded:', newEvent.on);
    this.main.loadedEvents += 1;
  }

  loadEventFile(eventFile) {
    try {
      winston.debug('Loading event file:', path.resolve(__dirname, '../events', eventFile));

      if (require.cache[path.resolve(__dirname, '../events', eventFile)]) {
        delete require.cache[path.resolve(__dirname, '../events', eventFile)];
      }

      const loadedEventFile = require(path.resolve(__dirname, '../events', eventFile));

      _.forEach(loadedEventFile, newEvent => this.loadEvent(newEvent));

      this.main.eventFilesCount += 1;
    } catch (err) {
      winston.error('Could not load file:', path.resolve(__dirname, '../events', eventFile), err);
    }
  }

  loadEventFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../events'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach(file => this.loadEventFile(file));

    winston.info(`Loaded ${this.main.loadedEvents} events from ${this.main.eventFilesCount} files.`);
  }

  loadTask(newTask) {
    if (!newTask.fn || typeof newTask.fn !== 'function') {
      winston.error('Not adding task: %s, the "fn" property of an imported object MUST be a function!', newTask.on);
      return;
    }

    setInterval(newTask.fn.bind(null, this.main), newTask.interval * 1000);
    newTask.fn.call(null, this.main);
    winston.debug('Bot task loaded:', newTask.name);
    this.main.loadedTasks += 1;
  }

  loadTaskFile(taskFile) {
    try {
      winston.debug('Loading task file:', path.resolve(__dirname, '../tasks', taskFile));

      if (require.cache[path.resolve(__dirname, '../tasks', taskFile)]) {
        delete require.cache[path.resolve(__dirname, '../tasks', taskFile)];
      }

      const loadedTaskFile = require(path.resolve(__dirname, '../tasks', taskFile));

      _.forEach(loadedTaskFile, newTask => this.loadTask(newTask));

      this.main.taskFilesCount += 1;
    } catch (err) {
      winston.error('Could not load file:', path.resolve(__dirname, '../tasks', taskFile), err);
    }
  }

  loadTaskFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../tasks'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach(file => this.loadTaskFile(file));

    winston.info(`Loaded ${this.main.loadedTasks} tasks from ${this.main.taskFilesCount} files.`);
  }
}

module.exports = ResourceLoader;

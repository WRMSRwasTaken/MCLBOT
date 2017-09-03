const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const _ = require('lodash');

class ResourceLoader {
  constructor(main) {
    this.main = main;

    this.main.commands = {};
    this.main.aliases = {};
    this.main.categorys = {};
    this.main.events = {};
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

  loadCommandFiles(category, reload) {
    const dirName = `./commands${(category) ? `/${category}` : ''}`;
    winston.debug('Scanning directory for command files:', dirName);

    for (const file of fs.readdirSync(dirName)) {
      if (fs.statSync(path.resolve(dirName, file)).isDirectory()) {
        if (category) {
          winston.warn('Ignoring folder %s in command category folder %s!', file, category);
        } else {
          winston.debug('Going to load files for category:', file);
          this.loadCommandFiles(file, reload);
        }
      } else {
        this.loadCommand(file.substring(0, file.lastIndexOf('.')).toLowerCase(), category, reload);
      }
    }
  }

  loadCommand(commandName, commandCategory, reload) {
    let filePath;
    let newCommand;

    if (!reload) {
      if (commandCategory) {
        filePath = path.resolve('./commands', `${commandCategory}/${commandName}.js`);
      } else {
        filePath = path.resolve('./commands', `${commandName}.js`);
      }
    } else if (this.main.commands[commandName]) {
      filePath = this.main.commands[commandName].filePAth;
    } else {
      throw new Error('Unknown command specified for reloading!');
    }

    // winston.debug('Loading bot command file:', filePath);

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
    newCommand.filePAth = filePath;

    if (this.main.commands[newCommand.name]) {
      throw new Error('Command name already exists. Try unloading it first.');
    }

    if (newCommand.alias && !Array.isArray(newCommand.alias)) {
      throw new Error('The "alias" property of an imported object MUST be none or an array');
    }

    if (!newCommand.fn || typeof newCommand.fn !== 'function') {
      throw new Error('The "fn" property of an imported object MUST be a function');
    }

    if (newCommand.desc && typeof newCommand.desc !== 'string') {
      winston.error('Not adding command: %s, the "desc" property of an imported object MUST be a string!', newCommand.name);
      return;
    }

    if (this.main.aliases[newCommand.name]) {
      winston.warn('Command: %s overwrites alias from command: %s', newCommand.name, this.main.aliases[newCommand.name]);
      delete this.main.aliases[newCommand.name];
    }

    this.main.categorys[newCommand.category] = this.main.categorys[newCommand.category] || {};
    if (newCommand.category) {
      this.main.categorys[newCommand.category][newCommand.name] = newCommand.name;
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

    // winston.debug('Loading bot event file:', filePath);

    try {
      newEvent = require(filePath);
    } catch (ex) {
      winston.error('Error loading event file:', ex.message);
      throw new Error('Error loading event file!');
    }

    if (!newEvent.fn || typeof newEvent.fn !== 'function') {
      throw new Error('The "fn" property of an imported object MUST be a function');
    }

    this.main.api.on(eventName, (...args) => newEvent.fn.apply(null, [].concat(this.main, args)));
    winston.debug('Bot event loaded:', eventName);
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

    if (!newTask.fn || typeof newTask.fn !== 'function') {
      throw new Error('The "fn" property of an imported object MUST be a function');
    }

    setInterval(newTask.fn.bind(null, this.main), newTask.interval * 1000);
    newTask.fn.call(null, this.main);
    winston.debug('Bot task loaded:', taskName);
  }

  loadTaskFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../tasks'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach(file => this.loadTask(file.substring(0, file.lastIndexOf('.'))));
  }
}

module.exports = ResourceLoader;

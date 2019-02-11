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
    this.main.categoryOverrides = {};
    this.main.uncategorizedCommands = [];
    this.main.pipes = {};
    this.main.events = {};
    this.main.types = {};
    this.main.tasks = {};
    this.main.middleware = {};
    this.main.jobs = {};

    this.commandObjectKeys = [ // see commands/README.md
      'name', // automatically set
      'hide',
      'alias',
      'owner',
      'description',
      'nsfw',
      'category', // automatically set, not set on subcommands
      'guildOnly',
      'guarded',
      'permission',
      'selfPermission',
      'cooldown',
      'arguments',
      'flags',
      'middleware',
      'hideTyping',
      'noConcurrent',
      'fn',
      'subcommands', // not set in subcommands
      'subcommandAliases', // automatically set
      'filePath', // automatically set
      'disabled',
    ];

    this.main.permissions = {
      ADMINISTRATOR: 'Administrator',
      CREATE_INSTANT_INVITE: 'Create instant invite',
      KICK_MEMBERS: 'Kick members',
      BAN_MEMBERS: 'Ban members',
      MANAGE_CHANNELS: 'Manage channels',
      MANAGE_GUILD: 'Manage server',
      ADD_REACTIONS: 'Add reactions',
      VIEW_AUDIT_LOG: 'View audit log',
      VIEW_CHANNEL: 'Read text channels and see voice channels',
      SEND_MESSAGES: 'Send messages',
      SEND_TTS_MESSAGES: 'Send TTS messages',
      MANAGE_MESSAGES: 'Manage messages',
      EMBED_LINKS: 'Embed links',
      ATTACH_FILES: 'Attach files',
      READ_MESSAGE_HISTORY: 'Read message history',
      MENTION_EVERYONE: 'Mention everyone',
      USE_EXTERNAL_EMOJIS: 'Use external emojis',
      CONNECT: 'Connect to a voice channel',
      SPEAK: 'Speak in a voice channel',
      MUTE_MEMBERS: 'Mute members',
      DEAFEN_MEMBERS: 'Deafen members',
      MOVE_MEMBERS: 'Move members',
      USE_VAD: 'Use voice activity detection',
      CHANGE_NICKNAME: 'Change the own nickname',
      MANAGE_NICKNAMES: 'Manage other member\'s nicknames',
      MANAGE_ROLES: 'Manage roles',
      MANAGE_WEBHOOKS: 'Manage webhooks',
      MANAGE_EMOJIS: 'Manage emojis',
    };
  }

  async reloadCategory(category) {
    if (category && !this.main.categories[category]) {
      throw new Error(`Category \`${category}\` does not exist!`);
    }

    await this.loadCategoryOverride(category, true);

    _.forEach(this.main.categories[category], (command) => {
      this.loadCommand(command, category, true);
    });
  }

  reloadAllCommands() {
    _.forEach(this.main.commands, (command) => {
      this.loadCommand(command.name, null, true);
    });
  }

  async loadCategoryOverride(category, reload = false) {
    const filePath = path.resolve('./commands', `${category}/category.json`);

    try {
      await fs.access(filePath);
    } catch (ex) {
      if (reload && !this.main.categoryOverrides[category]) {
        winston.debug('Override file for category %s has been deleted!', category);

        delete this.main.categoryOverrides[category]; // Delete it from memory if the file has been deleted but has been loaded before

        return;
      }

      if (!reload) {
        return; // there is no override file for this category
      }

      throw ex;
    }

    if (require.cache[require.resolve(filePath)]) {
      delete require.cache[require.resolve(filePath)];
    }

    this.main.categoryOverrides[category] = require(filePath);

    winston.debug('Loaded category override file for category: %s', category);
  }

  async loadCategory(category) {
    winston.debug('Going to load files for category: %s', category);

    await this.loadCategoryOverride(category);

    const categoryDir = fs
      .readdirSync(path.resolve(__dirname, `../commands/${category}`))
      .filter(file => file.slice(-3) === '.js' && !fs.statSync(path.resolve(`./commands/${category}`, file)).isDirectory());

    for (const file of categoryDir) {
      const commandName = file.substring(0, file.lastIndexOf('.'));

      try {
        await this.loadCommand(commandName, category);
      } catch (ex) { // loading a command file failed
        winston.error(`Error loading command ${commandName}: ${ex.message}`);
      }
    }
  }

  async loadCommandFiles() {
    const commandDir = await fs.readdir(path.resolve(__dirname, '../commands'));

    // first load all the "root" commands
    const commandFiles = commandDir.filter(file => file.slice(-3) === '.js' && !fs.statSync(path.resolve('./commands', file)).isDirectory());

    for (const commandFile of commandFiles) {
      const commandName = commandFile.substring(0, commandFile.lastIndexOf('.'));

      try {
        await this.loadCommand(commandName);
      } catch (ex) { // loading the category override file failed
        winston.error(`Error loading command ${commandName}: ${ex.message}`);
      }
    }

    // now we're going to enumerate all existing categories
    const commandCategories = commandDir.filter(file => fs.statSync(path.resolve('./commands', file)).isDirectory());

    // iterate through all categories
    for (const commandCategory of commandCategories) {
      try {
        await this.loadCategory(commandCategory);
      } catch (ex) { // loading the category override file failed
        winston.error(`Error loading category ${commandCategory}: ${ex.message}`);
      }
    }
  }

  validateCommandObject(commandObject, rootCommand) {
    for (const commandObjectKey of Object.keys(commandObject)) {
      if (!this.commandObjectKeys.includes(commandObjectKey)) {
        throw new Error(`Unknown command parameter: ${commandObjectKey}!`);
      }
    }


    if (commandObject.alias && !Array.isArray(commandObject.alias) && typeof commandObject.alias !== 'string') {
      throw new Error('The "alias" property must be none, a string or an array of strings');
    }

    if (commandObject.alias && Array.isArray(commandObject.alias)) {
      for (const alias of commandObject.alias) {
        if (typeof alias !== 'string') {
          throw new Error('The "alias" property must be none, a string or an array of strings');
        }
      }
    }

    if (commandObject.permission) {
      if (Array.isArray(commandObject.permission)) {
        for (const permission of commandObject.permission) {
          if (typeof permission !== 'string') {
            throw new Error('The "permission" property must be none, a string or an array of strings!');
          }
        }
      } else if (typeof commandObject.permission !== 'string') {
        throw new Error('The "permission" property must be none, a string or an array of strings!');
      }
    }

    if (commandObject.selfPermission) {
      if (Array.isArray(commandObject.selfPermission)) {
        for (const selfPermission of commandObject.selfPermission) {
          if (typeof selfPermission !== 'string') {
            throw new Error('The "selfPermission" property must be none, a string or an array of strings!');
          }
        }
      } else if (typeof commandObject.selfPermission !== 'string') {
        throw new Error('The "selfPermission" property must be none, a string or an array of strings!');
      }
    }

    if (commandObject.middleware) {
      if (Array.isArray(commandObject.middleware)) {
        for (const middleware of commandObject.middleware) {
          if (typeof middleware !== 'string') {
            throw new Error('The "middleware" property must be none, a string or an array of strings!');
          }

          if (!this.main.middleware[middleware]) {
            throw new Error(`Unknown middleware: ${middleware}!`);
          }
        }
      } else {
        if (typeof commandObject.middleware !== 'string') {
          throw new Error('The "middleware" property must be none, a string or an array of strings!');
        }

        if (!this.main.middleware[commandObject.middleware]) {
          throw new Error(`Unknown middleware: ${commandObject.middleware}!`);
        }
      }
    }

    if (rootCommand) { // subcommand
      if (!commandObject.fn || typeof commandObject.fn !== 'function') {
        throw new Error('The "fn" property of a subcommand must be a function');
      }

      if (!commandObject.description || typeof commandObject.description !== 'string') {
        throw new Error('The "description" property of a subcommand must be a string');
      }
    } else { // root command
      if (commandObject.fn && typeof commandObject.fn !== 'function' && typeof commandObject.fn !== 'string') {
        throw new Error('The "fn" property of a command must be none, a function or a string containing the name of a subcommand');
      }

      if (commandObject.fn && typeof commandObject.fn === 'function' && (!commandObject.description || typeof commandObject.description !== 'string')) {
        throw new Error('The "description" property of a command must be none or, if "fn" is a function, a string');
      }

      if (commandObject.fn && typeof commandObject.fn === 'string' && (!commandObject.subcommands || !commandObject.subcommands[commandObject.fn])) {
        throw new Error('The "fn" property of a command must be none, a function or a string containing the name of a subcommand');
      }
    }

    if (commandObject.arguments) {
      if (!Array.isArray(commandObject.arguments) || commandObject.arguments.length === 0) {
        throw new Error('The "arguments" property must be none or a non-empty array of objects');
      }

      for (const argument of commandObject.arguments) {
        if (typeof argument !== 'object') {
          throw new Error('The "arguments" property must be none or an array of objects');
        }

        if (!this.main.types[argument.type]) {
          throw new Error(`Unknown argument input type: ${argument.type}!`);
        }
      }
    }

    if (commandObject.flags) {
      if (typeof commandObject.flags !== 'object' || Object.keys(commandObject.flags).length === 0) {
        throw new Error('The "flags" property must be none or a non-empty object');
      }

      commandObject.shortFlags = {};

      for (const flagName of Object.keys(commandObject.flags)) {
        const flag = commandObject.flags[flagName];

        flag.name = flagName;

        if (typeof flag !== 'object') {
          throw new Error('The "flags" property must be none or a non-empty object');
        }

        if (flag.type && !this.main.types[flag.type]) {
          throw new Error(`Unknown flag input type: ${flag.type}!`);
        }

        if (flag.global && rootCommand) {
          throw new Error('The "global" property of a flag can only be set on the root command');
        }

        if (rootCommand && rootCommand.flags[flag.name] && rootCommand.flags[flag.name].global) {
          throw new Error(`Flag name: ${flag.name} has been already defined in the root command as global flag!`);
        }

        if (flag.short) {
          if (typeof flag.short !== 'string' && flag.short.length === 1) {
            throw new Error('The "short" property of a flag must be none or a single character string');
          }

          if (rootCommand && rootCommand.shortFlags && rootCommand.shortFlags[flag.short] && rootCommand.flags[rootCommand.shortFlags[flag.short]].global) {
            winston.warn(`Short flag: ${flag.short} for flag: ${flag.name} in subcommand: ${commandObject.name} of command: ${rootCommand.name} has been already defined in the root command as global flag with this short name, skipping short alias.`);
            return;
          }

          if (commandObject.shortFlags[flag.short]) {
            winston.warn(`Short flag: ${flag.short} overwrites short flag from flag: ${commandObject.shortFlags[flag.short]}${(rootCommand) ? ` in subcommand ${commandObject.name}` : ''}`);
          }

          commandObject.shortFlags[flag.short] = flag.name;
        }
      }
    }
  }

  async loadCommand(commandName, commandCategory, reload = false) {
    let filePath;

    if (reload && commandCategory && !this.main.categories[commandCategory]) {
      throw new Error(`Category \`${commandCategory}\` does not exist!`);
    }

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
      throw new Error(`Command \`${commandName}\` ${(commandCategory) ? `in category ${commandCategory}` : ''} does not exist!`);
    }

    if (!reload && this.main.commands[commandName]) {
      throw new Error('Command name already exists. Try unloading it first.');
    }

    try {
      await fs.access(filePath);
    } catch (ex) {
      winston.error('Command file cannot be found: %s', filePath);
      throw new Error('Command file cannot be found!');
    }

    if (require.cache[require.resolve(filePath)]) {
      delete require.cache[require.resolve(filePath)];
    }

    const newCommand = require(filePath);

    if (!Object.keys(newCommand).length) {
      throw new Error('Command file is empty');
    }

    if (newCommand.disabled) {
      if (!reload) {
        winston.warn('Command is disabled by command parameter.');
        throw new Error('Command is disabled by command parameter.');
      } else {
        throw new Error('Command is disabled by command parameter, please unload it to disable it.');
      }
    }

    newCommand.name = commandName;
    newCommand.category = (reload) ? this.main.commands[commandName].category : commandCategory;
    newCommand.filePath = filePath;

    this.validateCommandObject(newCommand);

    if (!newCommand.fn && !newCommand.subcommands) {
      throw new Error('Command has no function and no subcommands');
    }

    if (newCommand.subcommands) {
      if (typeof newCommand.subcommands !== 'object' || Object.keys(newCommand.subcommands).length === 0) {
        throw new Error('The "subcommands" property of an imported object MUST be a non-empty object');
      }

      newCommand.subcommandAliases = {};

      for (const subcommandName of Object.keys(newCommand.subcommands)) {
        const subcommand = newCommand.subcommands[subcommandName];

        subcommand.name = subcommandName;

        this.validateCommandObject(subcommand, newCommand);

        if (subcommand.alias) {
          if (!Array.isArray(subcommand.alias)) {
            this.addSubcommandAlias(newCommand, subcommand.name, subcommand.alias);
          } else {
            for (const newAlias of subcommand.alias) {
              this.addSubcommandAlias(newCommand, subcommand.name, newAlias);
            }
          }
        }
      }
    }

    if (this.main.aliases[newCommand.name]) {
      winston.warn('Command: %s overwrites alias from command: %s', newCommand.name, this.main.aliases[newCommand.name]);
      delete this.main.aliases[newCommand.name];
    }

    if (newCommand.category) {
      this.main.categories[newCommand.category] = this.main.categories[newCommand.category] || [];
      this.main.categories[newCommand.category].push(newCommand.name);
    } else if (!reload) {
      this.main.uncategorizedCommands.push(newCommand.name);
    }

    if (reload && this.main.commands[commandName].alias) {
      if (!Array.isArray(this.main.commands[commandName].alias)) {
        delete this.main.aliases[this.main.commands[commandName].alias];
      } else {
        for (const oldAlias of this.main.commands[commandName].alias) {
          delete this.main.aliases[oldAlias];
        }
      }
    }

    if (newCommand.alias) {
      if (!Array.isArray(newCommand.alias)) {
        this.addAlias(newCommand.name, newCommand.alias);
      } else {
        for (const newAlias of newCommand.alias) {
          this.addAlias(newCommand.name, newAlias);
        }
      }
    }

    this.main.commands[newCommand.name] = newCommand;
    winston.debug(`Command ${(reload) ? 're' : ''}loaded: %s`, newCommand.name);
  }

  addAlias(commandName, alias) {
    if (typeof alias !== 'string') {
      throw new Error('The "alias" property must be a string or an array of strings!');
    }

    if (this.main.commands[alias]) {
      winston.warn('Not adding alias: %s for command: %s, command already exists!', alias, commandName);
      return;
    }

    if (this.main.aliases[alias]) {
      winston.warn('Not adding alias: %s for command: %s, alias already exists! (used by command %s)', alias, commandName, this.main.aliases[alias]);
      return;
    }

    this.main.aliases[alias] = commandName;
    winston.debug('Added alias: %s -> %s', alias, commandName);
  }

  addSubcommandAlias(command, subcommandName, alias) {
    if (typeof alias !== 'string') {
      throw new Error('The "alias" property of a subcommand must be a string or an array of strings!');
    }

    if (command.subcommands[alias]) {
      winston.warn('Not adding alias: %s for subcommand: %s, subcommand already exists!', alias, subcommandName);
      return;
    }

    if (command.subcommandAliases[alias]) {
      winston.warn('Not adding alias: %s for subcommand: %s, alias already exists! (used by subcommand %s)', alias, subcommandName, command.subcommandAliases[alias]);
      return;
    }

    command.subcommandAliases[alias] = subcommandName;
    winston.debug(`Added subcommand alias: ${command.name} ${alias} -> ${command.name} ${subcommandName}`);
  }

  async loadEventFiles() {
    const eventDir = await fs.readdir(path.resolve(__dirname, '../events'));
    let lastLoaded;

    for (const rootEventFile of eventDir) {
      const rootStat = await fs.stat((path.resolve('./events', rootEventFile)));

      if (rootStat.isDirectory()) {
        const eventNameDir = await fs.readdir(path.resolve(__dirname, '../events', rootEventFile));

        for (const eventFile of eventNameDir) {
          const eventStat = await fs.stat((path.resolve('./events', rootEventFile, eventFile)));

          if (!eventStat.isDirectory() && eventFile.slice(-3) === '.js') {
            const eventName = eventFile.substring(0, eventFile.lastIndexOf('.'));

            try {
              await this.loadEvent(eventName, rootEventFile);
            } catch (ex) {
              winston.error(`Error loading event ${eventName}: ${ex.message}`);
            }
          }
        }

        lastLoaded = rootEventFile;
      } else if (rootEventFile.slice(-3) === '.js') {
        const eventName = rootEventFile.substring(0, rootEventFile.lastIndexOf('.'));

        if (lastLoaded === eventName) {
          winston.warn('Already loaded files for event %s in its folder! Consider placing the file %s in that folder (with another name)', eventName, rootEventFile);
        }

        try {
          await this.loadEvent(eventName);
        } catch (ex) {
          winston.error(`Error loading event ${eventName}: ${ex.message}`);
        }
      }
    }
  }

  loadEvent(eventName, displayName) {
    let filePath;
    let newEvent;

    if (displayName) {
      filePath = path.resolve('./events', displayName, `${eventName}.js`);
    } else {
      filePath = path.resolve('./events', `${eventName}.js`);
    }

    try {
      newEvent = require(filePath);
    } catch (ex) {
      winston.error('Error loading event file: %s', ex.message);
      throw new Error('Error loading event file!');
    }

    if (!Object.keys(newEvent).length) {
      winston.warn('Skipping empty event file: %s', filePath);
      return;
    }

    if (!newEvent.fn || typeof newEvent.fn !== 'function') {
      throw new Error('The "fn" property of an imported object MUST be a function');
    }

    if (newEvent.disabled) {
      winston.warn('Event %s has been disabled.', (displayName) ? `${displayName}/${eventName}` : eventName);
      return;
    }

    this.main.api.on(displayName || eventName, (...args) => newEvent.fn.apply(null, [].concat(this.main, args)));
    winston.debug(`Event loaded: ${(displayName) ? `${displayName} -> ${eventName}` : eventName}`);
  }

  executeTask(task, main) {
    if (!main.ready) {
      return;
    }

    // winston.debug('Executing task: %s', task.name);
    task.fn.call(null, main);
  }

  loadTask(taskName) {
    const filePath = path.resolve('./tasks', `${taskName}.js`);
    let newTask;

    try {
      newTask = require(filePath);
    } catch (ex) {
      winston.error('Error loading task file: %s', ex.message);
      throw new Error('Error loading task file!');
    }

    if (!Object.keys(newTask).length) {
      winston.warn('Skipping empty task file %s', filePath);
      return;
    }

    if (!newTask.fn || typeof newTask.fn !== 'function') {
      throw new Error('The "fn" property of an imported object MUST be a function');
    }

    if (!newTask.interval || typeof newTask.interval !== 'number') {
      throw new Error('The "interval" property of an imported object MUST be a number');
    }

    if (newTask.noSelfbot && nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false') {
      winston.debug('Skipped loading task in selfbot mode: %s', taskName);

      return;
    }

    if (newTask.disabled) {
      winston.warn('Task %s has been disabled.', taskName);
      return;
    }

    newTask.name = taskName;

    this.main.tasks[taskName] = newTask;
    winston.debug('Task loaded: %s', taskName);
  }

  startTasks() {
    for (const taskName of Object.keys(this.main.tasks)) {
      winston.debug('Starting task: %s', taskName);

      this.executeTask.call(null, this.main.tasks[taskName], this.main);

      this.main.tasks[taskName] = setInterval(this.executeTask.bind(null, this.main.tasks[taskName], this.main), this.main.tasks[taskName].interval * 1000);
    }
  }

  loadTaskFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../tasks'))
      .filter(file => file.slice(-3) === '.js')
      .forEach(file => this.loadTask(file.substring(0, file.lastIndexOf('.'))));
  }

  loadType(typeName) {
    const filePath = path.resolve('./types', `${typeName}.js`);
    let newType;

    try {
      newType = require(filePath);
    } catch (ex) {
      winston.error('Error loading type file: %s', ex.message);
      throw new Error('Error loading type file!');
    }

    if (!Object.keys(newType).length) {
      winston.warn('Skipping empty type file: %s', filePath);
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
    winston.debug('Command parameter type loaded: %s', newType.name);
  }

  loadTypeFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../types'))
      .filter(file => file.slice(-3) === '.js')
      .forEach(file => this.loadType(file.substring(0, file.lastIndexOf('.'))));
  }

  loadMiddleware(middlewareName) {
    const middlewarePath = path.resolve('./middleware', `${middlewareName}.js`);
    let newMiddleware;

    try {
      newMiddleware = require(middlewarePath);
    } catch (ex) {
      winston.error('Error loading middleware file: %s', ex.message);
      throw new Error('Error loading middleware file!');
    }

    if (!Object.keys(newMiddleware).length) {
      winston.warn('Skipping empty middleware file: %s', middlewarePath);
      return;
    }

    if (!newMiddleware.run || typeof newMiddleware.run !== 'function') {
      throw new Error('The "run" property of an imported object MUST be a function');
    }

    newMiddleware.name = middlewareName;

    this.main.middleware[newMiddleware.name] = newMiddleware;
    winston.debug('Middleware loaded: %s', newMiddleware.name);
  }

  loadMiddlewareFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../middleware'))
      .filter(file => file.slice(-3) === '.js')
      .forEach(file => this.loadMiddleware(file.substring(0, file.lastIndexOf('.'))));
  }

  loadJob(jobName) {
    const jobPath = path.resolve('./jobs', `${jobName}.js`);
    let newJob;

    try {
      newJob = require(jobPath);
    } catch (ex) {
      winston.error('Error loading job file: %s', ex.message);
      throw new Error('Error loading job file!');
    }

    if (!Object.keys(newJob).length) {
      winston.warn('Skipping empty job file: %s', jobPath);
      return;
    }

    // if (!newJob.run || typeof newJob.run !== 'function') {
    //   throw new Error('The "run" property of an imported object MUST be a function');
    // }

    newJob.name = jobName;

    this.main.jobs[newJob.name] = this.main.jobHelper.registerQueue(newJob.name, newJob.run);

    winston.debug('Job loaded: %s', newJob.name);
  }

  loadJobFiles() {
    fs
      .readdirSync(path.resolve(__dirname, '../jobs'))
      .filter(file => file.slice(-3) === '.js')
      .forEach(file => this.loadJob(file.substring(0, file.lastIndexOf('.'))));
  }
}

module.exports = ResourceLoader;

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const _ = require('lodash');

let filesCount = 0;
let tasksCount = 0;

module.exports = ((main) => {
  const funcs = {};

  funcs.loadEventFiles = () => {
    fs
      .readdirSync(path.resolve(__dirname, '../tasks'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach((file) => {
        try {
          winston.debug('Loading task file:', path.resolve(__dirname, '../tasks', file));
          const taskFile = require(path.resolve(__dirname, '../tasks', file))(main);

          _.forEach(taskFile, (newEvent) => {
            if (typeof newEvent.on !== 'string') {
              winston.error('The "on" property of an imported object MUST be a string!');
              return;
            }

            if (!newEvent.fn || typeof newEvent.fn !== 'function') {
              winston.error('Not adding task: %s, the "fn" property of an imported object MUST be a function!', newEvent.on);
              return;
            }

            main.bot.on(newEvent.on, newEvent.fn);
            winston.debug('Bot task loaded:', newEvent.on);
            tasksCount += 1;
          });

          filesCount += 1;
        } catch (err) {
          winston.error('Could not load file:', path.resolve(__dirname, '../tasks', file), err);
        }
      });

    winston.info(`Loaded ${tasksCount} tasks from ${filesCount} files.`);
  };

  return funcs;
});

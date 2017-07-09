const fs = require('fs');
const path = require('path');
const winston = require('winston');
const _ = require('lodash');

let filesCount = 0;
let eventsCount = 0;

module.exports = ((main) => {
  const funcs = {};

  funcs.loadEventFiles = () => {
    fs
      .readdirSync(path.resolve(__dirname, '../events'))
      .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
      .forEach((file) => {
        try {
          winston.debug('Loading event file:', path.resolve(__dirname, '../events', file));
          const eventFile = require(path.resolve(__dirname, '../events', file))(main);

          _.forEach(eventFile, (newEvent) => {
            if (typeof newEvent.on !== 'string') {
              winston.error('The "on" property of an imported object MUST be a string!');
              return;
            }

            if (!newEvent.fn || typeof newEvent.fn !== 'function') {
              winston.error('Not adding event: %s, the "fn" property of an imported object MUST be a function!', newEvent.on);
              return;
            }

            main.bot.on(newEvent.on, newEvent.fn);
            winston.debug('Bot event loaded:', newEvent.on);
            eventsCount += 1;
          });

          filesCount += 1;
        } catch (err) {
          winston.error('Could not load file:', path.resolve(__dirname, '../events', file), err);
        }
      });

    winston.info(`Loaded ${eventsCount} events from ${filesCount} files.`);
  };

  return funcs;
});

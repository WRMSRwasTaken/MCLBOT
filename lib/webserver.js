const nconf = require('nconf');
const winston = require('winston');
const express = require('express');
const _ = require('lodash');
const fs = require('fs-extra');
const moment = require('moment');

const server = express();

class Webserver {
  constructor(main) {
    this.main = main;
  }

  init() {
    winston.debug('isNaN(\'%s\'): %s', nconf.get('webserver:listen'), isNaN(parseInt(nconf.get('webserver:listen'), 10)));
    let listenIsUnixSocket = false;
    if (isNaN(parseInt(nconf.get('webserver:listen'), 10))) {
      winston.debug('Webserver listen parameter is a unix socket.');
      listenIsUnixSocket = true;
    }

    if (listenIsUnixSocket && fs.existsSync(nconf.get('webserver:listen'))) {
      winston.warn('Webserver socket file already exists at path: %s! Trying to remove it...', nconf.get('webserver:listen'));

      try {
        fs.unlinkSync(nconf.get('webserver:listen'));
      } catch (ex) {
        winston.error('Could not remove webserver socket file at path: %s!', nconf.get('webserver:listen'));
        return;
      }
    }

    try {
      this.socket = server.listen(nconf.get('webserver:listen'));
    } catch (ex) {
      winston.error('Could not listen on port %s!', nconf.get('webserver:listen'));
      return;
    }

    if (listenIsUnixSocket) {
      winston.debug('Setting permissions for webserver listen unix socket to:', nconf.get('webserver:listenUmask'));

      try {
        fs.chmodSync(nconf.get('webserver:listen'), nconf.get('webserver:listenUmask'));
      } catch (ex) {
        winston.error('Could set permissions for webserver listen unix socket to %d!', nconf.get('webserver:listenUmask'));
        return;
      }
    }

    setupPaths(this.main);

    winston.info('Webserver listening on', (listenIsUnixSocket) ? 'unix socket:' : 'port:', nconf.get('webserver:listen'));
  }

  exit() {
    if (this.socket) {
      winston.debug('Closing webserver socket...');
      this.socket.close();
    }
  }
}

function setupPaths(main) {
  const apiRouter = express.Router();
  server.use('/api', apiRouter);

  const serverRouter = express.Router({ mergeParams: true });

  // apiRouter.use('/server/:guildID(\\d+)', (req, res, next) => {
  //   if (!main.api.guilds.has(req.params.guildID)) {
  //     res.status(404);
  //     return res.json({ error: 'not found' });
  //   }
  //   next();
  // });

  apiRouter.use('/server/:guildID(\\d+)', serverRouter);

  serverRouter.use((req, res, next) => {
    if (!main.api.guilds.has(req.params.guildID)) {
      res.status(404);
      return res.json({ error: 'guild not found or has stats collect disabled' });
    }
    next();
  });

  serverRouter

    .get('/', (req, res, next) => {
      const guild = main.api.guilds.get(req.params.guildID);

      return res.json({ name: guild.name });
    })

    .get('/message', async (req, res, next) => {
      const msgResult = await main.influx.query(`select count(message_id) as messages, sum(attachment_count) as attachments, sum(char_count) as chars, sum(user_mention_count) as mentionedUsers, sum(word_count) as words from member_message where server_id = ${main.Influx.escape.stringLit(req.params.guildID)} and time > now() - 1d group by user_id`);

      const guild = main.api.guilds.get(req.params.guildID);

      _.forEach(msgResult, (user, index) => {
        msgResult[index].name = guild.members.get(user.user_id).displayName;
      });

      res.json(msgResult);
    });


  server.use((req, res, next) => {
    res.status(404);
    return res.json({ error: 'not found' });
  });

  server.use((err, req, res, next) => {
    res.status(err.status || 500);
    return res.json({ error: 'internal server error' });
  });
}


module.exports = Webserver;

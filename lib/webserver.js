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

const util = require('util');

function setupPaths(main) {
  const router = express.Router();
  server.use(router);

  router.route('/')

    .get((req, res, next) => {
      res.send('hi');
    });

  router.route('/:server_id(\\d+)')

    .get(async (req, res, next) => {
      main.prometheusMetrics.sqlReads.inc();

      const dbResult = await main.db.member_message.findAll({
        attributes: [
          [
            main.db.sequelize.fn('COUNT', main.db.sequelize.col('message_id')),
            'message_count',
          ],
          [
            'user_id',
            'user_id',
          ],
        ],
        where: {
          server_id: req.params.server_id,
          created_at: {
            $gte: moment().subtract(1, 'day'),
          },
        },
        group: [
          'user_id',
        ],
        order: [
          [
            main.db.sequelize.fn('COUNT', 'message_count'),
            'DESC',
          ],
        ],
      });

      res.write(`<html>Top users by message count on server ${main.api.guilds.get(req.params.server_id).name}<br><br>`);

      if (dbResult.length === 0) {
        return res.end('Unknown server id (the bot is not member of this server), no messages have been sent in the specified time rage or no messages have been sent at all since the bot is member of that server.');
      }

      _.forEach(dbResult, (user) => {
        res.write(`${user.user_id}:${user.get('message_count')}<br>`);
      });

      res.end();
    });
}


module.exports = Webserver;

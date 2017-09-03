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
  const router = express.Router();
  server.use(router);

  router.route('/')

    .get((req, res, next) => {
      res.send('hi');
    });

}


module.exports = Webserver;

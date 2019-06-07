const nconf = require('nconf');
const winston = require('winston');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const server = express();

class Webserver {
  constructor(main) {
    this.main = main;
  }

  start() {
    server.set('view engine', 'pug');
    server.use('/static', express.static(path.resolve(__dirname, '../public')));

    const statsRouter = require(path.resolve(__dirname, '../web/statsRouter.js'))(this.main);
    server.use('/stats', statsRouter);

    server.use((req, res, next) => {
      res.status(404);
      return res.render('404');
    });

    server.use((err, req, res, next) => {
      winston.error(err.message);
      res.status(err.status || 500);
      return res.json({ error: 'internal server error' });
    });

    try {
      server.listen(nconf.get('webserver:port'), nconf.get('webserver:address')); // TODO: this is not shard aware yet
    } catch (ex) {
      winston.error('Could not bind webserver to address %s!', `${nconf.get('webserver:address')}:${nconf.get('webserver:port')}`);
      return;
    }

    winston.info('Webserver listening on: %s', `${nconf.get('webserver:address')}:${nconf.get('webserver:port')}`);
  }
}

module.exports = Webserver;

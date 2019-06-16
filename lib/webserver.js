const nconf = require('nconf');
const winston = require('winston');
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const raven = require('raven');

const server = express();

class Webserver {
  constructor(main) {
    this.main = main;
  }

  start() {
    if (nconf.get('webserver:trustproxy')) {
      server.set('trust proxy', nconf.get('webserver:trustproxy').split(','));
    }

    server.set('view engine', 'pug');

    server.use(morgan('short', { stream: { write: message => winston.info(message.trim()) } }));

    server.use('/static', express.static(path.resolve(__dirname, '../public')));

    const statsRouter = require(path.resolve(__dirname, '../web/statsRouter.js'))(this.main);
    server.use('/stats', statsRouter);

    const apiRouter = require(path.resolve(__dirname, '../web/apiRouter.js'))(this.main);
    server.use('/api/v1', apiRouter);

    server.use((req, res, next) => {
      res.status(404);
      return res.render('404');
    });

    server.use((err, req, res, next) => { // TODO: we need to handle async errors in each route file because express only handles exceptions in the initial syncronous execution
      winston.error(err.message);

      res.status(err.status || 500);

      raven.captureException(err, {
        extra: {
          requestURL: req.url,
        },
      });

      return res.send('Internal server error');
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

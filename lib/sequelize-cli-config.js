const nconf = require('nconf');

require('./settings.js');

module.exports = {
  development: {
    username: nconf.get('database:username'),
    password: nconf.get('database:password'),
    database: nconf.get('database:database'),
    host: nconf.get('database:host'),
    port: nconf.get('database:port'),
    dialect: 'postgresql',
  },
  production: {
    username: nconf.get('database:username'),
    password: nconf.get('database:password'),
    database: nconf.get('database:database'),
    host: nconf.get('database:host'),
    port: nconf.get('database:port'),
    dialect: 'postgresql',
  },
};

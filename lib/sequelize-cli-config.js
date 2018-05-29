const nconf = require('nconf');

require('./settings.js');

module.exports = {
  development: {
    username: nconf.get('database:username'),
    password: nconf.get('database:password'),
    database: nconf.get('database:database'),
    host: nconf.get('database:host'),
    port: nconf.get('database:port'),
    dialect: nconf.get('database:dialect'),
    operatorsAliases: false,
  },
  production: {
    username: nconf.get('database:username'),
    password: nconf.get('database:password'),
    database: nconf.get('database:database'),
    host: nconf.get('database:host'),
    port: nconf.get('database:port'),
    dialect: nconf.get('database:dialect'),
    operatorsAliases: false,
  },
};

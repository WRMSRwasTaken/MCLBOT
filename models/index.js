const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const basename = path.basename(module.filename);
const db = {};

const winston = require('winston');
const nconf = require('nconf');

const config = {
  host: nconf.get('database:host'),
  port: nconf.get('database:port'),
  dialect: nconf.get('database:dialect'),
  logging: (msg) => {
    if (nconf.get('loglevel') === 'debug') {
      winston.debug(msg);
    }
  },
};

const sequelize = new Sequelize(nconf.get('database:database'), nconf.get('database:username'), nconf.get('database:password'), config);

fs
  .readdirSync(__dirname)
  .filter(file => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
  .forEach((file) => {
    const model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

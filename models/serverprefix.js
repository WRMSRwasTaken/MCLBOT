
module.exports = function (sequelize, DataTypes) {
  const ServerPrefix = sequelize.define('ServerPrefix', {
    prefix: DataTypes.STRING,
  }, {
    classMethods: {
      associate(models) {
        // associations can be defined here
      },
    },
  });
  return ServerPrefix;
};


module.exports = function (sequelize, DataTypes) {
  const server_prefix = sequelize.define('server_prefix', {
    server_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    prefix: DataTypes.STRING,
  }, {
    underscored: true,
    tableName: 'server_prefix',
    classMethods: {
      associate(models) {
        // associations can be defined here
      },
    },
  });
  return server_prefix;
};

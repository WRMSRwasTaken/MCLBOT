
module.exports = function (sequelize, DataTypes) {
  const guild_prefix = sequelize.define('guild_prefix', {
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    prefix: DataTypes.STRING,
  }, {
    underscored: true,
    tableName: 'guild_prefix',
    classMethods: {
      associate(models) {
        // associations can be defined here
      },
    },
  });
  return guild_prefix;
};

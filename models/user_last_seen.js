
module.exports = function (sequelize, DataTypes) {
  const user_last_seen = sequelize.define('user_last_seen', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
  }, {
    underscored: true,
    tableName: 'user_last_seen',
    classMethods: {
      associate(models) {
        // associations can be defined here
      },
    },
  });
  return user_last_seen;
};

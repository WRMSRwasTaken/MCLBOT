
module.exports = function (sequelize, DataTypes) {
  const member_last_message = sequelize.define('member_last_message', {
    server_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
  }, {
    underscored: true,
    tableName: 'member_last_message',
    classMethods: {
      associate(models) {
        // associations can be defined here
      },
    },
  });
  return member_last_message;
};

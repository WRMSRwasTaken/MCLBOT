
module.exports = function (sequelize, DataTypes) {
  const member_message = sequelize.define('member_message', {
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
    message_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
  }, {
    underscored: true,
    tableName: 'member_message',
    classMethods: {
      associate(models) {
        // associations can be defined here
      },
    },
  });
  return member_message;
};

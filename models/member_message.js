
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
    channel_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    message_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    char_count: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    word_count: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    user_mention_count: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    attachment_count: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER,
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

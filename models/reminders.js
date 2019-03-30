module.exports = (sequelize, DataTypes) => {
  const reminders = sequelize.define('reminders', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    fake_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    notify_date: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    text: {
      type: DataTypes.STRING(2000),
    },
    message_id: {
      type: DataTypes.BIGINT,
    },
    channel_id: {
      type: DataTypes.BIGINT,
    },
    guild_id: {
      type: DataTypes.BIGINT,
    },
    queue_id: {
      type: DataTypes.STRING,
    },
  }, {
    underscored: true,
    tableName: 'reminders',
  });
  reminders.associate = (models) => {
    // associations can be defined here
  };
  return reminders;
};

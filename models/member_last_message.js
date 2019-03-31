module.exports = (sequelize, DataTypes) => {
  const reminders = sequelize.define('member_last_message', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    channel_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    timestamp: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  }, {
    underscored: true,
    tableName: 'member_last_message',
    timestamps: false,
  });
  reminders.associate = (models) => {
    // associations can be defined here
  };
  return reminders;
};

module.exports = (sequelize, DataTypes) => {
  const reminders = sequelize.define('member_events', {
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
    type: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.ENUM('JOIN', 'LEAVE'),
    },
    timestamp: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.DATE,
    },
  }, {
    underscored: true,
    tableName: 'member_events',
    timestamps: false,
  });
  reminders.associate = (models) => {
    // associations can be defined here
  };
  return reminders;
};

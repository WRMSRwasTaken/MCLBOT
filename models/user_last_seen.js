module.exports = (sequelize, DataTypes) => {
  const reminders = sequelize.define('user_last_seen', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    last_seen: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  }, {
    underscored: true,
    tableName: 'user_last_seen',
    timestamps: false,
  });
  reminders.associate = (models) => {
    // associations can be defined here
  };
  return reminders;
};

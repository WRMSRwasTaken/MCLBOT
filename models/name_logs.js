module.exports = (sequelize, DataTypes) => {
  const reminders = sequelize.define('name_logs', {
    user_id: {
      allowNull: false,
      type: DataTypes.BIGINT,
    },
    type: {
      allowNull: false,
      type: DataTypes.ENUM('USERNAME', 'DISCRIMINATOR', 'TAG', 'NICKNAME'),
    },
    guild_id: {
      type: DataTypes.BIGINT,
    },
    before: {
      type: DataTypes.STRING(40),
    },
    after: {
      type: DataTypes.STRING(40),
    },
  }, {
    underscored: true,
    tableName: 'name_logs',
  });
  reminders.associate = (models) => {
    // associations can be defined here
  };
  reminders.removeAttribute('id');
  return reminders;
};

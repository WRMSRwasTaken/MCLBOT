module.exports = (sequelize, DataTypes) => {
  const reminders = sequelize.define('reminders', {
    user_id: DataTypes.BIGINT,
    time: DataTypes.INTEGER,
    text: DataTypes.STRING(2000),
  }, {
    underscored: true,
  });
  reminders.associate = (models) => {
    // associations can be defined here
  };
  return reminders;
};

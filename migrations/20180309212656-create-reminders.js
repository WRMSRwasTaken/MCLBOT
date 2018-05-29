module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('reminders', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT,
    },
    time: {
      type: Sequelize.INTEGER,
    },
    text: {
      type: Sequelize.STRING(2000),
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  }),
  down: (queryInterface, Sequelize) => queryInterface.dropTable('reminders'),
};

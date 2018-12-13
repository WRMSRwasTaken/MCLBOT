module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('reminders', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT,
    },
    fake_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    notify_date: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    text: {
      allowNull: false,
      type: Sequelize.STRING(2000),
    },
    queue_id: {
      type: Sequelize.STRING,
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

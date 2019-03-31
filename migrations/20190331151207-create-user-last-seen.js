module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('user_last_seen', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT,
    },
    last_seen: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  }),
  down: (queryInterface, Sequelize) => queryInterface.dropTable('user_last_seen'),
};

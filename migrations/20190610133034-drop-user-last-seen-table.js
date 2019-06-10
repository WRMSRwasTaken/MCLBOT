module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.dropTable('user_last_seen'),
  down: (queryInterface, Sequelize) => queryInterface.sequelize.query('select 1+1'), // eh
};

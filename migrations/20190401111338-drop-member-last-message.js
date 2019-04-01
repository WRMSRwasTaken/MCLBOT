module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.dropTable('member_last_message'),
  down: (queryInterface, Sequelize) => queryInterface.sequelize.query('select 1+1'), // nah
};

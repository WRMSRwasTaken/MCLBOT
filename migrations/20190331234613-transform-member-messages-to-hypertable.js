module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.query('select create_hypertable(\'member_messages\', \'timestamp\')'),
  down: (queryInterface, Sequelize) => queryInterface.sequelize.query('select 1+1'), // we'd have to drop and recreate the whole table to undo a hypertable transformation
};

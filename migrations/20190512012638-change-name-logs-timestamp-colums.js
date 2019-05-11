module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.renameColumn('name_logs', 'created_at', 'timestamp', { transaction: t });
    await queryInterface.removeColumn('name_logs', 'updated_at', { transaction: t });
  }),
  down: (queryInterface, Sequelize) => queryInterface.sequelize.query('select 1+1'), // nah
};

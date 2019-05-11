module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.renameColumn('name_logs', 'type', 'type_old', { transaction: t });
    await queryInterface.addColumn('name_logs', 'type', {
      type: Sequelize.ENUM('USERNAME', 'DISCRIMINATOR', 'TAG', 'NICKNAME'),
    }, { transaction: t });
    await queryInterface.sequelize.query('update name_logs set type = (enum_range(null::enum_name_logs_type))[type_old]', { transaction: t });
    await queryInterface.removeColumn('name_logs', 'type_old', { transaction: t });
  }),
  down: (queryInterface, Sequelize) => queryInterface.sequelize.query('select 1+1'), // nah
};

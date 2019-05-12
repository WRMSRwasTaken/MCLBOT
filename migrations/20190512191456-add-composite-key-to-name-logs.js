module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.addConstraint('name_logs', [
      'user_id',
      'type',
      'timestamp',
    ], {
      type: 'PRIMARY KEY',
      name: 'name_logs_pkey',
      transaction: t,
    });
    await queryInterface.addIndex('name_logs', {
      fields: [
        'user_id',
        'type',
        'guild_id',
        'timestamp',
      ],
      transaction: t,
    });
  }),
  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.removeConstraint('name_logs', 'name_logs_pkey', { transaction: t });
    await queryInterface.removeIndex('name_logs', [
      'user_id',
      'type',
      'guild_id',
      'timestamp',
    ], { transaction: t });
  }),
};

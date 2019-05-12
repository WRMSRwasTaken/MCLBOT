module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.createTable('member_events', {
      user_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      guild_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      type: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.ENUM('JOIN', 'LEAVE'),
      },
      timestamp: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DATE,
      },
    }, { transaction: t });
    await queryInterface.sequelize.query('select create_hypertable(\'member_events\', \'timestamp\')', { transaction: t });
  }),
  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.dropTable('member_events', { transaction: t });
    await queryInterface.sequelize.query('drop type enum_member_events_type', { transaction: t });
  }),
};

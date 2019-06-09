module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.createTable('guild_member_counts', {
      guild_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      timestamp: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DATE,
      },
      members_online: {
        allowNull: false,
        type: Sequelize.BIGINT,
      },
      members_total: {
        allowNull: false,
        type: Sequelize.BIGINT,
      },
    }, { transaction: t });
    await queryInterface.sequelize.query('select create_hypertable(\'guild_member_counts\', \'timestamp\')', { transaction: t });
  }),
  down: (queryInterface, Sequelize) => queryInterface.dropTable('guild_member_counts'),
};

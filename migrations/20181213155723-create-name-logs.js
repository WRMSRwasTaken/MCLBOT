module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('name_logs', {
    user_id: {
      allowNull: false,
      type: Sequelize.BIGINT,
    },
    type: {
      allowNull: false,
      type: Sequelize.INTEGER, // 1 = username, 2 = discrim, 3 = tag, 4 = (per) guild nickname
    },
    guild_id: {
      type: Sequelize.BIGINT,
    },
    before: {
      type: Sequelize.STRING(40),
    },
    after: {
      type: Sequelize.STRING(40),
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
  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.dropTable('name_logs', { transaction: t });
    await queryInterface.sequelize.query('drop type enum_name_logs_type', { transaction: t }); // yes this should be in the other migration file normally
  }),
};

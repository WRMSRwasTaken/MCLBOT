module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('delete_guild_settings_queue', {
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT,
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('delete_guild_settings_queue'),
};

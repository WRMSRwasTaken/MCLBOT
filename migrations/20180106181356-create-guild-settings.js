
module.exports = {
  up(queryInterface, Sequelize) {
    return queryInterface.createTable('guild_settings', {
      guild_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      key: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING,
      },
      value: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down(queryInterface, Sequelize) {
    return queryInterface.dropTable('guild_settings');
  },
};

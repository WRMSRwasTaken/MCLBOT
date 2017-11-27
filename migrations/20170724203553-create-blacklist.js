
module.exports = {
  up(queryInterface, Sequelize) {
    queryInterface.createTable('blacklist', {
      guild_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      channel_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      user_id: {
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
    });
  },
  down(queryInterface, Sequelize) {
    return queryInterface.dropTable('blacklist');
  },
};

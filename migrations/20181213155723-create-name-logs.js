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
      type: Sequelize.STRING(32), // Discord's max username / nickname length is 32
    },
    after: {
      type: Sequelize.STRING(32),
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('name_logs'),
};

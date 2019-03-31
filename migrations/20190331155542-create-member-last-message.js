module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('member_last_message', {
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
    channel_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT,
    },
    timestamp: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  }),
  down: (queryInterface, Sequelize) => queryInterface.dropTable('member_last_message'),
};

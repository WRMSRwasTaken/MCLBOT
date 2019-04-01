module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('member_messages', {
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
    message_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT,
    },
    char_count: {
      allowNull: false,
      type: Sequelize.INTEGER,
    },
    word_count: {
      allowNull: false,
      type: Sequelize.INTEGER,
    },
    user_mention_count: {
      allowNull: false,
      type: Sequelize.INTEGER,
    },
    attachment_count: {
      allowNull: false,
      type: Sequelize.INTEGER,
    },
    timestamp: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.DATE,
    },
  }),
  down: (queryInterface, Sequelize) => queryInterface.dropTable('member_messages'),
};


module.exports = {
  up(queryInterface, Sequelize) {
    return queryInterface.createTable('member_message', {
      server_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      user_id: {
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
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      word_count: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_mention_count: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      attachment_count: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      created_at: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DATE,
      },
    });
  },
  down(queryInterface, Sequelize) {
    return queryInterface.dropTable('member_message');
  },
};

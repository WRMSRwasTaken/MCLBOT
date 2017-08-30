
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
      message_id: {
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
    return queryInterface.dropTable('member_message');
  },
};

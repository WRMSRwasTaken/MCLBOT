
module.exports = {
  up(queryInterface, Sequelize) {
    queryInterface.createTable('blacklist', {
      server_id: {
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

    // return queryInterface.addIndex('blacklist', [
    //   'server_id',
    //   'channel_id',
    //   'user_id',
    // ], {
    //   indexName: 'blacklist_composite_index',
    //   indicesType: 'UNIQUE',
    // });
  },
  down(queryInterface, Sequelize) {
    return queryInterface.dropTable('blacklist');
  },
};

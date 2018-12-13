module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('muted_members', {
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT,
    },
    target_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT,
    },
    target_tag: {
      allowNull: false,
      type: Sequelize.STRING,
    },
    invoker_id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.BIGINT,
    },
    expires_at: {
      type: Sequelize.DATE,
    },
    queue_id: {
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
  }),
  down: (queryInterface, Sequelize) => queryInterface.dropTable('muted_members'),
};

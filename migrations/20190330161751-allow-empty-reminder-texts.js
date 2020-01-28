module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.addColumn('reminders', 'message_id', {
      type: Sequelize.BIGINT,
    }, { transaction: t }),
    queryInterface.addColumn('reminders', 'guild_id', {
      type: Sequelize.BIGINT,
    }, { transaction: t }),
    queryInterface.addColumn('reminders', 'channel_id', {
      type: Sequelize.BIGINT,
    }, { transaction: t }),
    queryInterface.changeColumn('reminders', 'text', {
      type: Sequelize.STRING(2000),
      allowNull: true,
    }, { transaction: t }),
  ])),
  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.removeColumn('reminders', 'message_id', { transaction: t }),
    queryInterface.removeColumn('reminders', 'guild_id', { transaction: t }),
    queryInterface.removeColumn('reminders', 'channel_id', { transaction: t }),
    queryInterface.changeColumn('reminders', 'text', {
      type: Sequelize.STRING(2000),
      allowNull: false,
    }, { transaction: t }),
  ])),
};

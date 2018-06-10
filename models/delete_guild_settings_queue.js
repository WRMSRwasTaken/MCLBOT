module.exports = (sequelize, DataTypes) => {
  const delete_guild_settings_queue = sequelize.define('delete_guild_settings_queue', {
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
  }, {
    underscored: true,
    tableName: 'delete_guild_settings_queue',
  });
  delete_guild_settings_queue.associate = (models) => {
    // associations can be defined here
  };
  return delete_guild_settings_queue;
};

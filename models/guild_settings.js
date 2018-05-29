module.exports = (sequelize, DataTypes) => {
  const guild_settings = sequelize.define('guild_settings', {
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    key: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.STRING,
    },
    value: {
      allowNull: false,
      type: DataTypes.STRING,
    },
  }, {
    underscored: true,
    tableName: 'guild_settings',
  });
  guild_settings.associate = (models) => {
    // associations can be defined here
  };
  return guild_settings;
};

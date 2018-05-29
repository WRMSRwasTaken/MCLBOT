module.exports = (sequelize, DataTypes) => {
  const blacklist = sequelize.define('blacklist', {
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    channel_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
  }, {
    underscored: true,
    tableName: 'blacklist',
  });
  blacklist.associate = (models) => {
    // associations can be defined here
  };
  return blacklist;
};

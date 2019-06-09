module.exports = (sequelize, DataTypes) => {
  const guild_member_counts = sequelize.define('guild_member_counts', {
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    timestamp: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.DATE,
    },
    members_online: {
      allowNull: false,
      type: DataTypes.BIGINT,
    },
    members_total: {
      allowNull: false,
      type: DataTypes.BIGINT,
    },
  }, {
    underscored: true,
    tableName: 'guild_member_counts',
    timestamps: false,
  });
  guild_member_counts.associate = (models) => {
    // associations can be defined here
  };
  return guild_member_counts;
};

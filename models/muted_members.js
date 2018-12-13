module.exports = (sequelize, DataTypes) => {
  const muted_members = sequelize.define('muted_members', {
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    target_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    target_tag: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    invoker_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    expires_at: {
      type: DataTypes.DATE,
    },
    queue_id: {
      type: DataTypes.STRING,
    },
  }, {
    underscored: true,
    tableName: 'muted_members',
  });
  muted_members.associate = (models) => {
    // associations can be defined here
  };
  return muted_members;
};

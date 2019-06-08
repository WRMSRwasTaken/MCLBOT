module.exports = (sequelize, DataTypes) => {
  const user_last_seen = sequelize.define('user_last_seen', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    last_seen: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  }, {
    underscored: true,
    tableName: 'user_last_seen',
    timestamps: false,
  });
  user_last_seen.associate = (models) => {
    // associations can be defined here
  };
  return user_last_seen;
};

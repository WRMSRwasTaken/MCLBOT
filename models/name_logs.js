module.exports = (sequelize, DataTypes) => {
  const name_logs = sequelize.define('name_logs', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    type: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.ENUM('USERNAME', 'DISCRIMINATOR', 'TAG', 'NICKNAME'),
    },
    guild_id: {
      type: DataTypes.BIGINT,
    },
    before: {
      type: DataTypes.STRING(40),
    },
    after: {
      type: DataTypes.STRING(40),
    },
    timestamp: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.DATE,
    },
  }, {
    underscored: true,
    tableName: 'name_logs',
    timestamps: false,
  });
  name_logs.associate = (models) => {
    // associations can be defined here
  };
  return name_logs;
};

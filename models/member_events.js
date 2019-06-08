module.exports = (sequelize, DataTypes) => {
  const member_events = sequelize.define('member_events', {
    user_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    guild_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    type: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.ENUM('JOIN', 'LEAVE'),
    },
    timestamp: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.DATE,
    },
  }, {
    underscored: true,
    tableName: 'member_events',
    timestamps: false,
  });
  member_events.associate = (models) => {
    // associations can be defined here
  };
  return member_events;
};

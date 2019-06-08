module.exports = (sequelize, DataTypes) => {
  const member_messages = sequelize.define('member_messages', {
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
    channel_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    message_id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    char_count: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    word_count: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    user_mention_count: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    attachment_count: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    timestamp: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.DATE,
    },
  }, {
    underscored: true,
    tableName: 'member_messages',
    timestamps: false,
  });
  member_messages.associate = (models) => {
    // associations can be defined here
  };
  return member_messages;
};

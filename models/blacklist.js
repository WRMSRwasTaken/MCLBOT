
module.exports = function (sequelize, DataTypes) {
  const blacklist = sequelize.define('blacklist', {
    server_id: {
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
    // indexes: [
    //   {
    //     unique: true,
    //     fields: [
    //       'server_id',
    //       'channel_id',
    //       'user_id',
    //     ],
    //   },
    // ],
    classMethods: {
      associate(models) {
        // associations can be defined here
      },
    },
  });
  return blacklist;
};

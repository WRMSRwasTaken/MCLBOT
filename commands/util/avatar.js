module.exports = {
  desc: 'get an user\'s avatar',
  arguments: [
    {
      label: 'user id | mention | user name/tag',
      type: 'member',
      optional: false,
    },
    {
      label: 'leltest',
      type: 'member',
      optional: false,
    },
  ],
  fn: async (ctx, user) => `\`${user.user.tag}\`'s avatar is: ${user.user.displayAvatarURL({ format: 'png', size: 2048 })}`,
};

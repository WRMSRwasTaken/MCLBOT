module.exports = {
  desc: 'get an user\'s avatar',
  arguments: [
    {
      label: 'user',
      type: 'user',
      optional: true,
    },
  ],
  fn: async (ctx, user) => `\`${user.tag}\`'s avatar is: ${user.displayAvatarURL({ format: 'png', size: 2048 })}`,
};

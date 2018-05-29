module.exports = {
  description: 'get a user\'s avatar',
  arguments: [
    {
      label: 'user',
      type: 'user',
      optional: true,
    },
  ],
  flags: {
    size: {
      label: 'image size',
      short: 's',
      type: 'integer',
    },
  },
  fn: async (ctx, user) => `\`${user.tag}\`'s avatar is: ${user.displayAvatarURL({ size: 2048 })}`,
};

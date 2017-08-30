module.exports = {
  desc: 'get an user\'s avatar',
  optArgs: ['user id | mention | user name/tag'],
  fn: async (message, param, main) => {
    const user = await main.userHelper.getUser(message, param);
    return (user) ? `\`${user.tag}\`'s avatar is: ${user.displayAvatarURL({ format: 'png', size: 2048 })}` : 'No user found.';
  },
};

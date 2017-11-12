module.exports = {
  desc: 'Leave the current server',
  guildOnly: true,
  permission: 'ADMINISTRATOR',
  fn: async ctx => ctx.guild.leave(),
};

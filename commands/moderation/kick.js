module.exports = {
  desc: 'kicks an user from the server',
  permission: 'KICK_MEMBERS',
  guildOnly: true,
  arguments: [
    {
      label: 'member',
      type: 'member',
    },
    {
      label: 'reason',
      type: 'string',
      infinite: true,
      optional: true,
    },
  ],
  fn: async (ctx, member, reason) => {
    ctx.reply(`going to kick user ${member.user.tag} with reason ${reason}`);
  },
};

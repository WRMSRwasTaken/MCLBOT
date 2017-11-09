module.exports = {
  desc: 'bans an user from the server',
  permission: 'BAN_MEMBERS',
  guildOnly: true,
  arguments: [
    {
      label: 'member',
      type: 'member',
    },
    {
      label: 'days',
      type: 'integer',
      skip: true,
      optional: true,
    },
    {
      label: 'reason',
      type: 'string',
      infinite: true,
      optional: true,
    },
  ],
  fn: async (ctx, member, days, reason) => {
    if (member.user.id === ctx.main.api.user.id) {
      return 'Sorry, but I cannot ban myself.';
    }

    if (!member.bannable) {
      return `Sorry, but the member \`${member.user.tag}\` is not bannable.`;
    }

    const msg = await ctx.reply(`Do you really want to ban the member \`${member.user.tag}\`?`);

    const confirm = ctx.main.confirmationHelper.initConfirm(msg, ctx.author);

    confirm.on('timeout', () => {
      msg.edit(`Ban of member \`${member.user.tag}\` cancelled, due to input timeout.`);
    });

    confirm.on('false', () => {
      msg.edit(`Ban of member \`${member.user.tag}\` cancelled.`);
    });

    confirm.on('true', async () => {
      await member.ban({ days, reason });

      msg.edit(`Member \`${member.user.tag}\` has been banned.`);
    });

    return true;
  },
};

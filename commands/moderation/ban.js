module.exports = {
  description: 'bans a user from the server',
  permission: 'BAN_MEMBERS',
  selfPermission: 'BAN_MEMBERS',
  guildOnly: true,
  arguments: [
    {
      label: 'member',
      type: 'member',
      infinite: true,
    },
  ],
  flags: {
    days: {
      label: 'days',
      type: 'integer',
      short: 'd',
    },
    reason: {
      label: 'reason',
      type: 'string',
      short: 'r',
      infinite: true,
    },
  },
  fn: async (ctx, member, flags) => {
    const msg = await ctx.reply(`Do you really want to ban the member \`${member.user.tag}\`?`);

    const confirm = ctx.main.confirmationHelper.initConfirm(msg, ctx.author);

    confirm.on('timeout', () => {
      msg.edit(`Ban of member \`${member.user.tag}\` cancelled, due to input timeout.`);
    });

    confirm.on('false', () => {
      msg.edit(`Ban of member \`${member.user.tag}\` cancelled.`);
    });

    confirm.on('true', async () => {
      await member.ban({ days: flags.days, reason: flags.reason });

      msg.edit(`Member \`${member.user.tag}\` has been banned.`);
    });

    return true;
  },
};

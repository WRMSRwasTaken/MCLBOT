module.exports = {
  description: 'kicks an user from the server',
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
    if (member.user.id === ctx.main.api.user.id) {
      return 'Sorry, but I cannot kick myself.';
    }

    if (!member.kickable) {
      return `Sorry, but the member \`${member.user.tag}\` is not kickable.`;
    }

    const msg = await ctx.reply(`Do you really want to kick the member \`${member.user.tag}\`?`);

    const confirm = ctx.main.confirmationHelper.initConfirm(msg, ctx.author);

    confirm.on('timeout', () => {
      msg.edit(`Kick of member \`${member.user.tag}\` cancelled, due to input timeout.`);
    });

    confirm.on('false', () => {
      msg.edit(`Kick of member \`${member.user.tag}\` cancelled.`);
    });

    confirm.on('true', async () => {
      await member.kick(reason);

      msg.edit(`Member \`${member.user.tag}\` has been kicked.`);
    });

    return true;
  },
};

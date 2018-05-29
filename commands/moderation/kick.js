module.exports = {
  description: 'kicks a user from the server',
  permission: 'KICK_MEMBERS',
  selfPermission: 'KICK_MEMBERS',
  guildOnly: true,
  arguments: [
    {
      label: 'member',
      type: 'member',
      infinite: true,
    },
  ],
  flags: {
    reason: {
      label: 'reason',
      type: 'string',
      short: 'r',
      infinite: true,
    },
  },
  fn: async (ctx, member, flags) => {
    if (!ctx.main.userHelper.checkGuildMemberHierarchy(ctx, member)) {
      return `Sorry, but the member \`${member.user.tag}\` is above your top role or the same.`;
    }

    if (member.user.id === ctx.main.api.user.id) {
      return 'Sorry, but I won\'t kick myself. If you want me to leave, use the `leave` command.';
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
      await member.kick(flags.reason);

      msg.edit(`Member \`${member.user.tag}\` has been kicked.`);
    });

    return true;
  },
};

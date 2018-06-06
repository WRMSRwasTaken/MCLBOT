module.exports = {
  description: 'softly bans a user from the server (banning a member for deleting his/her messages and unbanning directly afterwards)',
  permission: 'BAN_MEMBERS',
  selfPermission: 'BAN_MEMBERS',
  guildOnly: true,
  arguments: [
    {
      label: 'member',
      type: 'member',
      infinite: true,
    },
    {
      label: 'days',
      type: 'integer',
      skippable: true,
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
    const msg = await ctx.reply(`Do you really want to softban the member \`${member.user.tag}\`?`);

    const confirm = ctx.main.confirmationHelper.initConfirm(msg, ctx.author);

    confirm.on('timeout', () => {
      msg.edit(`Softban of member \`${member.user.tag}\` cancelled, due to input timeout.`);
    });

    confirm.on('false', () => {
      msg.edit(`Softban of member \`${member.user.tag}\` cancelled.`);
    });

    confirm.on('true', async () => {
      await member.ban({ days, reason });

      await ctx.guild.unban(member, 'Ban removal for softban');

      msg.edit(`Member \`${member.user.tag}\` has been softbanned.`);
    });

    return true;
  },
};

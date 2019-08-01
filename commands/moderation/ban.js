module.exports = {
  description: 'Bans a user from this server',
  permission: 'BAN_MEMBERS',
  selfPermission: 'BAN_MEMBERS',
  alias: ['hackban'],
  guildOnly: true,
  middleware: false,
  arguments: [
    {
      label: 'Member or user ID',
      type: 'string',
      infinite: true,
    },
  ],
  flags: {
    days: {
      label: 'days',
      type: 'integer',
      short: 'd',
    },
  },
  fn: async (ctx, userid, flags) => {
    let hackban = false;
    let userToBan;

    const guildMember = await ctx.main.userHelper.getGuildMember(ctx, userid);

    if (guildMember) {
      if (!await ctx.main.middleware.checkModerationTarget.run(ctx, guildMember)) { // we disabled the middleware for hackbanning support, but we need to check it for regular guild members
        return false;
      }

      userToBan = guildMember;
    } else {
      const user = await ctx.main.userHelper.getUser(ctx, userid);

      if (!user) {
        return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid user given (for users not on this server you must supply the user ID, aka hackbanning)');
      }

      const bans = await ctx.guild.fetchBans();

      if (bans.has(userid)) {
        return ctx.main.stringUtils.argumentError(ctx, 0, `User \`${user.tag}\` is already banned from this server`);
      }

      userToBan = user;
      hackban = true;
    }

    let msg;

    if (hackban) {
      msg = await ctx.reply(`Do you really want to hackban the user \`${userToBan.tag}\`?`);
    } else {
      msg = await ctx.reply(`Do you really want to ban the member \`${userToBan.user.tag}\`?`);
    }

    const confirm = ctx.main.confirmationHelper.initConfirm(msg, ctx.author);

    confirm.on('timeout', () => {
      if (hackban) {
        msg.edit(`Hackban of user \`${userToBan.tag}\` cancelled, due to input timeout.`);
      } else {
        msg.edit(`Ban of member \`${userToBan.user.tag}\` cancelled, due to input timeout.`);
      }
    });

    confirm.on('false', () => {
      if (hackban) {
        msg.edit(`Hackban of member \`${userToBan.tag}\` cancelled.`);
      } else {
        msg.edit(`Ban of member \`${userToBan.user.tag}\` cancelled.`);
      }
    });

    confirm.on('true', async () => {
      if (hackban) {
        await ctx.guild.members.ban(userToBan, { days: flags.days, reason: flags.reason });

        msg.edit(`User \`${userToBan.tag}\` has been hackbanned.`);
      } else {
        await userToBan.ban({ days: flags.days, reason: flags.reason });

        msg.edit(`Member \`${userToBan.user.tag}\` has been banned.`);
      }
    });

    return true;
  },
};

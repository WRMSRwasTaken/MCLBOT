const XRegExp = require('xregexp');

module.exports = {
  description: 'Removes the block for a user from sending messages',
  permission: 'MANAGE_MESSAGES',
  selfPermission: 'MANAGE_CHANNELS',
  guildOnly: true,
  middleware: false,
  arguments: [
    {
      label: 'member',
      type: 'string',
      infinite: true,
    },
  ],
  flags: {
    force: {
      label: 'force unmute of a guild member although the command sais that a member is not muted',
      short: 'f',
    },
  },
  fn: async (ctx, memberString, flags) => {
    if (flags.force) {
      const member = ctx.main.userHelper.getGuildMember(ctx, memberString);

      if (!member) {
        return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid user provided.');
      }

      await ctx.main.userHelper.unmuteMember(ctx, member.id);

      return `\`${member.user.tag}\` has been force-unmuted.`;
    }

    const Op = ctx.main.db.Sequelize.Op;

    const mentionResult = XRegExp.exec(memberString, ctx.main.userHelper.mentionRegex);

    let mutedMember;

    if (mentionResult) { // mentioned user or userid
      const mentionedUser = await ctx.main.userHelper.getUser(ctx, memberString);

      if (!mentionedUser) {
        return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid user provided.');
      }

      mutedMember = await ctx.main.db.muted_members.findOne({
        where: {
          guild_id: ctx.guild.id,
          target_id: mentionedUser.id,
        },
      });

      if (!mutedMember) {
        return `\`${mentionedUser.tag}\` is not muted on this server.`;
      }
    } else {
      mutedMember = await ctx.main.db.muted_members.findOne({
        where: {
          guild_id: ctx.guild.id,
          target_tag: {
            [Op.iLike]: `%${memberString}%`,
          },
        },
      });

      if (!mutedMember) {
        return ctx.main.stringUtils.argumentError(ctx, 0, `No muted users found matching \`${memberString}\`. To view the list of currently muted users on this server, use the \`mute list\` command.`);
      }
    }

    if (mutedMember.expires_at && mutedMember.expires_at < Date.now() + 10000) {
      return `The mute status of \`${mutedMember.target_tag}\` will expire automatically in less than 10 seconds, please be patient.`;
    }

    await ctx.main.userHelper.unmuteMember(ctx, mutedMember.target_id);

    return `\`${mutedMember.target_tag}\` has been unmuted.`;
  },
};

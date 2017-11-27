async function setPrefix(ctx, prefix) {
  await ctx.main.prefixHelper.setGuildPrefix(ctx.guild.id, prefix);

  return `The bot's custom prefix has been set to \`${prefix}\` for this server`;
}

async function showPrefix(ctx) {
  const prefix = await ctx.main.prefixHelper.getGuildPrefixFromDB(ctx.guild.id);

  if (prefix) {
    return `The bot's current custom prefix for this server is \`${prefix.prefix}\``;
  }

  return `The bot's default prefix is \`${ctx.main.prefixHelper.getDefaultPrefix()}\` (No custom prefix has been set for this server)`;
}

module.exports = {
  desc: 'display or manages the bot\'s server command prefix',
  guildOnly: true,
  arguments: [
    {
      label: 'prefix',
      type: 'string',
      infinite: true,
      optional: true,
    },
  ],
  fn: async (ctx, prefix) => {
    if (!prefix) {
      return showPrefix(ctx);
    }

    if (!ctx.member.hasPermission('ADMINISTRATOR') && !ctx.isBotAdmin) {
      return ctx.reply('Sorry, but only guild administrators can set a custom bot prefix.');
    }

    return setPrefix(ctx, prefix);
  },
  subcommands: {
    show: {
      desc: 'displays the bot\'s current server command prefix',
      fn: async ctx => showPrefix(ctx),
    },
    set: {
      desc: 'sets the bot\'s server command prefix',
      permission: 'ADMINISTRATOR',
      arguments: [
        {
          label: 'prefix',
          type: 'string',
          infinite: true,
        },
      ],
      fn: async (ctx, prefix) => setPrefix(ctx, prefix),
    },
    reset: {
      desc: 'resets the bot\'s server command prefix to it\'s default value',
      permission: 'ADMINISTRATOR',
      fn: async (ctx) => {
        const prefix = await ctx.main.prefixHelper.getGuildPrefixFromDB(ctx.guild.id);

        if (!prefix) {
          return `There's currently no custom prefix set for this server. (The bot's default prefix is\`${ctx.main.prefixHelper.getDefaultPrefix()}\`)`;
        }

        await ctx.main.prefixHelper.deleteGuildPrefix(ctx.guild.id);

        return `The bot's prefix for this server has been reset to it's default: \`${ctx.main.prefixHelper.getDefaultPrefix()}\``;
      },
    },
  },
};


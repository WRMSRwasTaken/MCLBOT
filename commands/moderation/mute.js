module.exports = {
  description: 'Block users from sending messages',
  permission: 'MANAGE_MESSAGES',
  selfPermission: 'MANAGE_CHANNELS',
  guildOnly: true,
  arguments: [
    {
      label: 'member',
      type: 'member',
      infinite: true,
    },
  ],
  flags: {
    duration: {
      type: 'duration',
      short: 'd',
      min: 60,
      infinite: true,
    },
  },
  subcommands: {
    list: {
      description: 'List all muted users on this server',
      middleware: false,
      fn: async (ctx) => {
        ctx.main.prometheusMetrics.sqlReads.inc(1);

        const entryCount = await ctx.main.db.muted_members.count({
          where: {
            guild_id: ctx.guild.id,
          },
        });

        if (entryCount === 0) {
          return 'There are currently no muted users on this server.';
        }

        const resultsPerPage = 10;

        const paginatedEmbed = await ctx.main.paginationHelper.createPaginatedEmbedList(ctx);

        paginatedEmbed.on('paginate', async (pageNumber) => {
          ctx.main.prometheusMetrics.sqlReads.inc(2);

          const results = await ctx.main.db.muted_members.findAndCountAll({
            where: {
              guild_id: ctx.guild.id,
            },
            limit: resultsPerPage,
            offset: (pageNumber - 1) * resultsPerPage,
          });

          let list = '';

          for (const row of results.rows) {
            if (list !== '') {
              list += '\n';
            }

            list += `• \`${row.target_tag}\` (ID: ${row.target_id})${(row.expires_at) ? ` ${ctx.main.stringUtils.formatUnixTimestamp(row.expires_at)}` : ''}`;
          }

          let pageCount = Math.floor(results.count / resultsPerPage);

          if (entryCount % resultsPerPage !== 0) {
            pageCount += 1;
          }

          paginatedEmbed.emit('updateContent', {
            pageContent: list,
            pageCount,
            entryCount: results.count,
            title: 'Muted users',
          });
        });

        paginatedEmbed.emit('paginate', 1);

        return true;
      },
    },
  },
  fn: async (ctx, member, flags) => {
    const result = await ctx.main.userHelper.muteMember(ctx, member, flags.duration);

    if (!result) {
      return `\`${member.user.tag}\` has already been muted! Use the \`unmute\` command to revoke this`;
    }

    return `\`${member.user.tag}\` has been muted ${(flags.duration) ? `until ${ctx.main.stringUtils.formatUnixTimestamp(Date.now() + flags.duration * 1000)}` : ''}`;
  },
};

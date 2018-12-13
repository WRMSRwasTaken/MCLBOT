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
        const resultsPerPage = 10;

        ctx.main.prometheusMetrics.sqlReads.inc(2);

        const results = await ctx.main.db.muted_members.findAndCountAll({
          where: {
            guild_id: ctx.guild.id,
          },
          limit: resultsPerPage,
        });

        if (results.count === 0) {
          return 'There are currently no muted users on this server.';
        }

        let list = '';

        for (const row of results.rows) {
          if (list !== '') {
            list += '\n';
          }

          list += `• \`${row.target_tag}\` (ID: ${row.target_id})${(row.expires_at) ? ` ${ctx.main.stringUtils.formatUnixTimestamp(row.expires_at.getTime())}` : ''}`;
        }

        const embed = new ctx.main.Discord.MessageEmbed();

        embed.addField('Muted users', list);

        const mutedList = await ctx.reply({
          embed,
        });

        if (results.count <= resultsPerPage) {
          return false;
        }

        let maxPages = Math.floor(results.count / resultsPerPage);

        if (results.count % resultsPerPage !== 0) {
          maxPages += 1;
        }

        const paginationHelper = ctx.main.paginationHelper.initPagination(ctx, maxPages);

        if (!paginationHelper) {
          return false;
        }

        paginationHelper.on('paginate', async (pageNumber) => {
          ctx.main.prometheusMetrics.sqlReads.inc(2);

          const paginatedResults = await ctx.main.db.muted_members.findAndCountAll({
            where: {
              guild_id: ctx.guild.id,
            },
            limit: resultsPerPage,
            offset: (pageNumber - 1) * resultsPerPage,
          });

          // mutedList.pagination.pageCount = paginatedResults.count;

          let paginatedList = '';

          for (const row of paginatedResults.rows) {
            if (paginatedList !== '') {
              paginatedList += '\n';
            }

            paginatedList += `• \`${row.target_tag}\` (ID: ${row.target_id})${(row.expires_at) ? ` ${ctx.main.stringUtils.formatUnixTimestamp(row.expires_at.getTime())}` : ''}`;
          }

          const paginatedEmbed = new ctx.main.Discord.MessageEmbed();

          paginatedEmbed.addField('Muted users', paginatedList);

          mutedList.edit({
            paginatedEmbed,
          });
        });

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

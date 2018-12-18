module.exports = {
  description: 'Show all the logs the bot has of the users name or nickname',
  alias: 'names',
  arguments: [
    {
      label: 'user',
      type: 'user',
      optional: true,
    },
  ],
  flags: {
    size: {
      label: 'image size',
      short: 's',
      type: 'integer',
    },
  },
  fn: async (ctx, user) => {
    ctx.main.prometheusMetrics.sqlReads.inc(1);

    const queryUser = user || ctx.author;

    const Op = ctx.main.db.Sequelize.Op;

    let query;

    if (ctx.guild) {
      query = {
        user_id: queryUser.id,
        [Op.or]: [
          { guild_id: ctx.guild.id },
          { guild_id: null },
        ],
      };
    } else {
      query = {
        user_id: queryUser.id,
        guild_id: null,
      };
    }

    const logCount = await ctx.main.db.name_logs.count({
      where: query,
    });

    if (logCount === 0) {
      return `\`${queryUser.tag}\` does not have any name changes recorded.`;
    }

    const resultsPerPage = 10;

    let pageCount = Math.floor(logCount / resultsPerPage);

    if (logCount % resultsPerPage !== 0) {
      pageCount += 1;
    }

    const paginatedEmbed = await ctx.main.paginationHelper.createPaginatedEmbedList(ctx, `Name logs for user ${queryUser.tag}`, pageCount);

    if (!paginatedEmbed) {
      return false;
    }

    paginatedEmbed.on('paginate', async (pageNumber) => {
      ctx.main.prometheusMetrics.sqlReads.inc(2);

      const paginatedResults = await ctx.main.db.name_logs.findAndCountAll({
        where: query,
        limit: resultsPerPage,
        order: [['created_at', 'DESC']],
        offset: (pageNumber - 1) * resultsPerPage,
      });

      let paginatedList = '';

      for (const row of paginatedResults.rows) {
        if (paginatedList !== '') {
          paginatedList += '\n';
        }

        paginatedList += '• ';

        switch (row.type) {
          case 1:
            paginatedList += `\`${row.after}\``;
            break;
          case 2:
            paginatedList += `[Discrim] \`#${row.before}\` => #\`${row.after}\``;
            break;
          case 3:
            paginatedList += `[Tag] \`${row.after}\``;
            break;
          case 4:
            paginatedList += '[Nick] ';

            if (row.type === 4 && !row.before) {
              paginatedList += `\`${row.after}\``;
            } else if (row.type === 4 && !row.after) {
              paginatedList += '<removed nick>';
            } else {
              paginatedList += `\`${row.after}\``;
            }

            break;
          default:
            break;
        }

        paginatedList += ` at ${ctx.main.stringUtils.formatUnixTimestamp(row.created_at, 1)}`;
      }

      let newPageCount = Math.floor(logCount / resultsPerPage);

      if (logCount % resultsPerPage !== 0) {
        newPageCount += 1;
      }

      paginatedEmbed.emit('update', paginatedList, newPageCount, paginatedResults.count);
    });

    paginatedEmbed.emit('paginate', 1);

    return true;
  },
};

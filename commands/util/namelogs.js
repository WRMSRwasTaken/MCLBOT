module.exports = {
  description: 'Show all the logs the bot has of the users name or nickname',
  alias: 'names',
  arguments: [
    {
      label: 'user',
      type: 'user',
      optional: true,
      infinite: true,
    },
  ],
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

    let entryCount = await ctx.main.db.name_logs.count({
      where: query,
    });

    if (entryCount === 0) {
      return `\`${queryUser.tag}\` does not have any name changes recorded.`;
    }

    ctx.main.prometheusMetrics.sqlReads.inc(1);

    const firstRecordedName = await ctx.main.db.name_logs.findOne({
      where: {
        user_id: queryUser.id,
        [Op.or]: [
          { type: 1 },
          { type: 3 },
        ],
      },
      order: [['created_at', 'ASC']],
    });

    const resultsPerPage = 10;

    const paginatedEmbed = await ctx.main.paginationHelper.createPaginatedEmbedList(ctx);

    paginatedEmbed.on('paginate', async (pageNumber) => {
      ctx.main.prometheusMetrics.sqlReads.inc(2);

      const results = await ctx.main.db.name_logs.findAndCountAll({
        where: query,
        limit: resultsPerPage,
        order: [['created_at', 'DESC']],
        offset: (pageNumber - 1) * resultsPerPage,
      });

      let list = '';

      for (const row of results.rows) {
        if (list !== '') {
          list += '\n';
        }

        list += '• ';

        switch (row.type) {
          case 1:
            list += `\`${row.after}\``;
            break;
          case 2:
            list += `[Discrim] \`#${row.before}\` => #\`${row.after}\``;
            break;
          case 3:
            list += `[Tag] \`${row.after}\``;
            break;
          case 4:
            list += '[Nick] ';

            if (row.type === 4 && !row.before) {
              list += `\`${row.after}\``;
            } else if (row.type === 4 && !row.after) {
              list += '<removed nick>';
            } else {
              list += `\`${row.after}\``;
            }

            break;
          default:
            break;
        }

        list += ` at ${ctx.main.stringUtils.formatUnixTimestamp(row.createdAt, 1)}`;
      }

      entryCount = results.count;

      if (firstRecordedName) {
        entryCount += 1; // we want to show the oldest recorded nickname as the last entry
      }

      let pageCount = Math.floor(entryCount / resultsPerPage);

      if (entryCount % resultsPerPage !== 0) {
        pageCount += 1;
      }

      if (firstRecordedName && pageNumber >= pageCount) {
        list += `\nOldest recorded name: \`${firstRecordedName.before}\``;
      }

      paginatedEmbed.emit('updateContent', {
        pageContent: list,
        pageCount,
        entryCount,
        title: `Name logs for user ${queryUser.tag}`,
      });
    });

    paginatedEmbed.emit('paginate', 1);

    return true;
  },
};

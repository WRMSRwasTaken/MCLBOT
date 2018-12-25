module.exports = {
  description: 'Shows a list of servers a user and the bot have in common',
  arguments: [
    {
      label: 'user',
      type: 'user',
      infinite: true,
      optional: true,
    },
  ],
  fn: async (ctx, user) => {
    const resultsPerPage = 10;

    if (user.id === ctx.main.api.user.id) {
      return 'no';
    }

    const commonGuilds = ctx.main.userHelper.getGuildsInCommon(user);

    if (commonGuilds.length === 0) {
      return 'I don\'t have any servers in common with that user.';
    }

    let pageCount = Math.floor(commonGuilds.length / resultsPerPage);

    if (commonGuilds.length % resultsPerPage !== 0) {
      pageCount += 1;
    }

    const paginatedEmbed = await ctx.main.paginationHelper.createPaginatedEmbedList(ctx, `Servers in common for user ${user.tag}`, pageCount);

    if (!paginatedEmbed) {
      return false;
    }

    paginatedEmbed.on('paginate', async (pageNumber) => {
      const offset = resultsPerPage * (pageNumber - 1);

      let resultCount;

      if (commonGuilds.length > offset + resultsPerPage) {
        resultCount = offset + resultsPerPage - 1;
      } else {
        resultCount = commonGuilds.length - 1;
      }

      let pageText = '';

      for (let i = offset; i <= resultCount; i += 1) {
        pageText += `• ${commonGuilds[i]}\n`;
      }

      paginatedEmbed.emit('updateContent', pageText, commonGuilds.length);
    });

    paginatedEmbed.emit('paginate', 1);

    return true;
  },
};

const nconf = require('nconf');

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

    if (!ctx.isBotAdmin && (user.id === ctx.main.api.user.id || user.id === nconf.get('bot:owner'))) {
      return 'no';
    }

    let commonGuilds;

    if (ctx.main.api.shard) {
      const rpcGuilds = await ctx.main.api.shard.broadcastEval(`this.main.modules.userHelper.getGuildsInCommon('${user.id}')`);

      commonGuilds = rpcGuilds.flat();
    } else {
      commonGuilds = ctx.main.userHelper.getGuildsInCommon(user.id);
    }

    if (commonGuilds.length === 0) {
      return 'I don\'t have any servers in common with that user.';
    }

    let pageCount = Math.floor(commonGuilds.length / resultsPerPage);

    if (commonGuilds.length % resultsPerPage !== 0) {
      pageCount += 1;
    }

    const paginatedEmbed = await ctx.main.paginationHelper.createPaginatedEmbedList(ctx);

    paginatedEmbed.on('paginate', async (pageNumber) => {
      const offset = resultsPerPage * (pageNumber - 1);

      let results;

      if (commonGuilds.length > offset + resultsPerPage) {
        results = offset + resultsPerPage - 1;
      } else {
        results = commonGuilds.length - 1;
      }

      let list = '';

      for (let i = offset; i <= results; i += 1) {
        list += `• ${commonGuilds[i]}\n`;
      }

      paginatedEmbed.emit('updateContent', {
        pageContent: list,
        pageCount,
        entryCount: commonGuilds.length,
        title: `Servers in common for user ${user.tag}`,
      });
    });

    paginatedEmbed.emit('paginate', 1);

    return true;
  },
};

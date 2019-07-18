module.exports = {
  description: 'Takes a screenshot from a webpage',
  alias: ['ss'],
  arguments: [
    {
      label: 'url',
      type: 'string',
    },
  ],
  fn: async (ctx, url) => ctx.main.imageHelper.fAPI(ctx, 'screenshot', {
    args: {
      text: url,
    },
  }),
};

module.exports = {
  description: '🤔',
  alias: ['thonk'],
  arguments: [
    {
      label: 'text',
      type: 'string',
    },
  ],
  fn: async (ctx, text) => ctx.main.imageHelper.fAPI(ctx, 'thonkify', {
    args: {
      text,
    },
  }),
};

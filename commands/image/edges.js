module.exports = {
  description: 'Perform edge-tracing over a supplied image',
  alias: ['draw', 'trace'],
  arguments: [
    {
      label: 'url | user | emoji',
      type: 'image',
      optional: true,
    },
  ],
  fn: async (ctx, image) => ctx.main.imageHelper.fAPI(ctx, 'edges', {
    images: [image],
  }),
};

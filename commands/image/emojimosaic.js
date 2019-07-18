module.exports = {
  description: 'Generates an image of emojis based on the supplied image',
  alias: ['e2m'],
  arguments: [
    {
      label: 'url | user | emoji',
      type: 'image',
      optional: true,
    },
  ],
  flags: {
    gridsize: {
      label: 'Grid size',
      type: 'integer',
      short: 's',
      min: 16,
      max: 128,
    },
  },
  fn: async (ctx, image, flags) => ctx.main.imageHelper.fAPI(ctx, 'emojimosaic', {
    images: [image],
    args: {
      text: flags.gridsize || 64,
    },
  }),
};

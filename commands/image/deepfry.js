module.exports = {
  description: 'Apply a dozens of filters to the point where the image appears grainy, washed-out, and strangely colored',
  arguments: [
    {
      label: 'url | user | emoji',
      type: 'image',
      optional: true,
    },
  ],
  flags: {
    amount: {
      label: 'The amount of deepfrying to apply (default: 100)',
      type: 'integer',
      short: 'a',
      min: 1,
      max: 100,
    },
  },
  fn: async (ctx, image, flags) => ctx.main.imageHelper.fAPI(ctx, 'deepfry', {
    images: [image],
    args: {
      text: flags.amount,
    },
  }),
};

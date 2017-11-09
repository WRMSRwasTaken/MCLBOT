module.exports = {
  desc: 'swirl image pixels about the center',
  arguments: [
    {
      label: 'url',
      type: 'image',
      optional: true,
    },
  ],
  fn: async (ctx, image) => ctx.main.imageHelper.processImage(ctx, image, null, '-resize 800x800< -swirl 360'),
};


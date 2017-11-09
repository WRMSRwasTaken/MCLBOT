module.exports = {
  alias: ['invert'],
  desc: 'replace every pixel with its complementary color',
  arguments: [
    {
      label: 'url',
      type: 'image',
      optional: true,
    },
  ],
  fn: async (ctx, image) => ctx.main.imageHelper.processImage(ctx, image, null, '-resize 800x800< -negate'),
};


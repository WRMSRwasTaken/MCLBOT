module.exports = {
  alias: ['draw'],
  desc: 'edge-traces an image',
  arguments: [
    {
      label: 'url',
      type: 'image',
      optional: true,
    },
  ],
  fn: async (ctx, image) => ctx.main.imageHelper.processImage(ctx, image, null, '-resize 800x800< -morphology edgeout diamond:1 -evaluate multiply 3'),
};


module.exports = {
  alias: ['draw'],
  description: 'edge-traces an image',
  arguments: [
    {
      label: 'url',
      type: 'image',
      optional: true,
    },
  ],
  // fn: async (ctx, image) => ctx.main.imageHelper.processImage(ctx, image, null, '-morphology edgeout diamond:1 -evaluate multiply 3'),
  fn: async (ctx, image) => ctx.main.imageHelper.processImage(ctx, image, null, '-blur 1x.2 -solarize 50% -level 50%,0 -canny 0x1+10%+10%'),
};

module.exports = {
  alias: ['imagemagic', 'imagemagick', 'magic', 'magick', 'cas', 'liquid'],
  desc: 'rescales an image with seam-carving multiple times leading to image distortion',
  arguments: [
    {
      label: 'url | user',
      type: 'image',
      optional: true,
    },
  ],
  fn: async (ctx, image) => ctx.main.imageHelper.processImage(ctx, image, null, '-liquid-rescale 50% -liquid-rescale 150%'),
};


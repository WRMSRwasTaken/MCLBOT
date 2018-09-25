module.exports = {
  alias: ['e'],
  description: 'Enlarge an emoji image',
  arguments: [
    {
      label: 'emoji',
      type: 'emoji',
    },
  ],
  fn: async (ctx, emoji) => ctx.main.imageHelper.downloadAndAttachImage(ctx, emoji),
};

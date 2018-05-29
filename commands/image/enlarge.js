module.exports = {
  alias: ['e'],
  description: 'Enlarge an emoji image',
  arguments: [
    {
      label: 'emoji',
      type: 'emoji',
    },
  ],
  fn: async (ctx, emoji) => {
    let emojiData;

    try {
      emojiData = await ctx.main.imageHelper.downloadImage(emoji);
    } catch (ex) {
      return ctx.reply(ex.message);
    }

    return ctx.reply({
      files: [{
        attachment: emojiData,
        // name: 'emoji.png',
      }],
    });
  },
};


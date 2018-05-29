module.exports = {
  parse: async (value, argument, context) => {
    const emojiImageUrl = await context.main.stringUtils.getEmojiUrl(value);

    if (!emojiImageUrl) {
      throw new Error('Unknown emoji');
    }

    return emojiImageUrl;
  },
};

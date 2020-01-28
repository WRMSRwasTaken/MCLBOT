const validator = require('validator');

module.exports = {
  parse: async (value, argument, context) => {
    if (validator.isURL(value)) {
      return value;
    }

    const emojiUrl = await context.main.stringUtils.getEmojiUrl(value);

    if (emojiUrl) {
      return emojiUrl;
    }

    const user = await context.main.userHelper.getUser(context, value);

    if (user) {
      return user.displayAvatarURL({ size: 2048 });
    }

    throw new Error('No matching users found');
  },

  default: (context) => context.main.imageHelper.getLastImage(context),
};

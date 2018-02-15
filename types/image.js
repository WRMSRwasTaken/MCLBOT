const validator = require('validator');

async function getLastImage(ctx) {
  let imageURL;

  if (ctx.message.attachments.size > 0) {
    ctx.message.attachments.forEach((attachment) => {
      if (attachment.width && attachment.height && !imageURL) {
        imageURL = attachment.url;
      }
    });
  }

  if (imageURL) {
    return imageURL;
  }

  const messages = await ctx.channel.messages.fetch({
    limit: 20,
  });

  messages.forEach((message) => {
    if (message.attachments.size > 0) {
      message.attachments.forEach((attachment) => {
        if (attachment.width && attachment.height && !imageURL) {
          imageURL = attachment.url;
        }
      });
    }

    if (message.embeds.length > 0) {
      message.embeds.forEach((embed) => {
        if (embed.type === 'image' && !imageURL) {
          imageURL = embed.url;
        }

        if (embed.image && !imageURL) {
          imageURL = embed.image.url;
        }
      });
    }
  });

  if (!imageURL) {
    throw new Error('No images have been found in the last 20 messages of this channel!');
  }

  return imageURL;
}

module.exports = {
  parse: async (value, argument, context) => { // TODO: emoji support
    if (validator.isURL(value)) {
      return value;
    }

    const user = await context.main.userHelper.getUser(context, value);

    if (user) {
      return user.displayAvatarURL({ size: 2048 });
    }

    throw new Error('No matching users found');
  },

  default: context => getLastImage(context),
};

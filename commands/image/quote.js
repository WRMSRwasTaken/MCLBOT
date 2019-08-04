const moment = require('moment');
const nconf = require('nconf');
const XRegExp = require('xregexp');

const snowflakeRegex = XRegExp('^\\d{16,}$');

async function generateImage(ctx, user, text, flags) {
  return ctx.main.imageHelper.fAPI(ctx, 'quote', {
    args: {
      message: {
        content: text,
      },
      author: {
        username: (user.member) ? user.member.displayName : user.username,
        color: (user.member) ? ctx.main.userHelper.getMemberDisplayColor(user.member, !flags.light) : '#ffffff',
        avatarURL: user.displayAvatarURL(),
        bot: user.bot,
      },
      light: flags.light,
      compact: flags.compact,
      timestamp: `Today at ${moment((flags.timestamp) ? flags.timestamp : Date.now()).format('h:mm A')}`, // TODO: add customizable timestamps via flag
    },
  });
}

module.exports = {
  description: 'Generates a picture of a user quote',
  arguments: [
    {
      label: 'author',
      type: 'user',
    },
    {
      label: 'text',
      type: 'string',
      infinite: true,
    },
  ],
  flags: {
    light: {
      label: 'display as light themed',
      short: 'l',
      global: true,
    },
    compact: {
      label: 'display as compact mode',
      short: 'c',
      global: true,
    },
  },
  subcommands: {
    id: {
      description: 'Use an existing message to quote',
      alias: ['message', 'user'],
      arguments: [
        {
          label: 'Message ID or user',
          type: 'string',
        },
      ],
      fn: async (ctx, input, flags) => {
        let user;

        const isSnowflake = XRegExp.exec(input, snowflakeRegex);

        if (isSnowflake) {
          let message;

          try {
            message = await ctx.channel.messages.fetch(input); // first we try to fetch a message with the id directly
          } catch (ex) {
            // do nothing on purpose
          }

          if (message) {
            if (!message.content) {
              return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid message specified (this image needs to contain text to quote it)');
            }

            user = await ctx.main.userHelper.getUser(ctx, message.author); // in order to access user.member, we're just using my helper function

            flags.timestamp = message.editedTimestamp || message.createdTimestamp;

            return generateImage(ctx, user, message.content, flags);
          }
        }

        user = await ctx.main.userHelper.getUser(ctx, input);

        if (!user) {
          if (isSnowflake) {
            return ctx.main.stringUtils.argumentError(ctx, 0, 'No message in this channel or user found with the given ID');
          }

          return ctx.main.stringUtils.argumentError(ctx, 0, 'No user found for given input');
        }

        const messages = await ctx.channel.messages.fetch({
          limit: nconf.get('bot:maxMessagesSearch'),
        });

        for (const message of messages.values()) {
          if (message.author.id === user.id && message.content) {
            flags.timestamp = message.editedTimestamp || message.createdTimestamp;

            return generateImage(ctx, user, message.content, flags);
          }
        }

        return ctx.main.stringUtils.argumentError(ctx, 0, `No messages (containing text) found by user \`${user.tag}\` within the last ${nconf.get('bot:maxMessagesSearch')} messages of this channel`);
      },
    },
  },
  fn: async (ctx, user, text, flags) => generateImage(ctx, user, text, flags),
};

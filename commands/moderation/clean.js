const moment = require('moment');
const winston = require('winston');

const defaultMessages = 50;

async function cleanSingle(ctx, messages) {
  winston.debug('Will now single delete %d messages...', messages.size);

  let deleted = 0;

  for (const message of messages.values()) {
    if (message.deletable) {
      try {
        await message.delete();

        deleted += 1;
      } catch (ex) {
        // do nothing on purpose
      }
    }
  }

  winston.debug('Done single delete %d messages', messages.size);

  return deleted;
}

async function clean(ctx, filter, limit) {
  let searched = 0;
  let deleted = 0;

  for (let i = limit || defaultMessages; i > 0; i -= 100) {
    const amount = (i <= 100) ? i : 100;

    winston.debug('Fetching %d messages from the discord api...', amount);

    const messages = await ctx.channel.messages.fetch({limit: amount});

    const messagesToDelete = messages.filter(filter);

    searched += messages.size;

    if (messagesToDelete.size > 0) {
      if (messagesToDelete.last().createdAt < moment().subtract(2, 'weeks').toDate()) {
        winston.debug('Last message is older than 2 weeks, falling back to manually deleting messages');

        deleted += await cleanSingle(ctx, messagesToDelete);
      } else {
        try {
          await ctx.channel.bulkDelete(messagesToDelete.array());

          winston.debug('Calling bulkDelete() succeeded!');

          deleted += messagesToDelete.size;
        } catch (ex) {
          winston.debug('Calling bulkDelete() failed (%s), falling back to manually deleting messages', ex.message);

          deleted += await cleanSingle(ctx, messagesToDelete);
        }
      }
    }
  }

  winston.debug('clean() for %d messages finished', limit || defaultMessages);

  ctx.message.deleted = false;

  return `Removed ${deleted} message${(deleted === 1) ? '' : 's'} out of ${searched} searched message${(searched === 1) ? '' : 's'}.`;
}

module.exports = {
  description: 'Deletes messages according the given criteria in this channel',
  alias: ['prune', 'purge', 'clear'],
  permission: 'MANAGE_MESSAGES',
  selfPermission: 'MANAGE_MESSAGES',
  guildOnly: true,
  flags: {
    max: {
      label: 'max messages',
      type: 'integer',
      short: 'm',
      min: 1,
      max: 5000,
      global: true,
    },
  },
  middleware: false,
  subcommands: {
    invites: {
      description: 'Deletes messages containing an invite',
      fn: async (ctx, flags) => {
        const filter = message => message.content.search(/(discord\.gg\/.+|discordapp\.com\/invite\/.+)/i);

        return clean(ctx, filter, flags.max);
      },
    },
    user: {
      description: 'Deletes messages sent by specified user',
      arguments: [
        {
          label: 'user',
          type: 'user',
          infinite: true,
        },
      ],
      fn: async (ctx, user, flags) => {
        const filter = message => message.author.id === user.id;

        return clean(ctx, filter, flags.max);
      },
    },
    bots: {
      description: 'Deletes messages sent by bots',
      fn: async (ctx, flags) => {
        const filter = message => message.author.bot;

        return clean(ctx, filter, flags.max);
      },
    },
    attachments: {
      description: 'Deletes messages containing an attachment',
      fn: async (ctx, flags) => {
        const filter = message => message.attachments.size !== 0;

        return clean(ctx, filter, flags.max);
      },
    },
    embeds: {
      description: 'Deletes messages containing an embed',
      fn: async (ctx, flags) => {
        const filter = message => message.embeds.length !== 0;

        return clean(ctx, filter, flags.max);
      },
    },
    links: {
      description: 'Deletes messages containing a link',
      fn: async (ctx, flags) => {
        const filter = message => message.content.search(/https?:\/\/[^ \/\.]+\.[^ \/\.]+/) !== -1; // eslint-disable-line no-useless-escape

        return clean(ctx, filter, flags.max);
      },
    },
    all: {
      description: 'Deletes messages',
      fn: async (ctx, flags) => {
        const filter = true;

        return clean(ctx, filter, flags.max);
      },
    },
  },
};

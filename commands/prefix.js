module.exports = {
  desc: 'display or manages the bot\'s server command prefix',
  guildOnly: true,
  subcommands: {
    show: {
      desc: 'displays the bot\'s current server command prefix',
      fn: async (context) => {
        if (context.guildPrefixDisabled) {
          return 'The prefix has been disabled for this server. To enable it, run `prefix enable`.';
        }

        return `The bot's current prefix for this server is \`${context.guildPrefix}\` ${(context.guildPrefix === context.main.prefixHelper.getDefaultPrefix()) ? '(This is the default prefix, to set a custom prefix run `prefix set`)' : ''}`;
      },
    },
    set: {
      desc: 'sets the bot\'s server command prefix',
      permissions: 'ADMINISTRATOR',
      arguments: [
        {
          label: 'prefix',
          type: 'string',
          infinite: true,
        },
      ],
      fn: async (context, prefix) => {
        if (context.guildPrefixDisabled) {
          return 'The prefix has been disabled for this server. To set a custom guild prefix, enable it first with `prefix enable`.';
        }

        await context.main.prefixHelper.setGuildPrefix(context.guild.id, prefix);

        return `The bot's custom prefix has been set to \`${prefix}\` for this server`;
      },
    },
    reset: {
      desc: 'resets the bot\'s server command prefix to it\'s default value',
      permissions: 'ADMINISTRATOR',
      fn: async (context) => {
        if (context.guildPrefixDisabled) {
          return 'The prefix has been disabled for this server. To reset a guild prefix, enable it first with `prefix enable`.';
        }

        if (context.guildPrefix === context.main.prefixHelper.getDefaultPrefix()) {
          return 'There\'s currently no custom prefix set for this server.';
        }

        await context.main.prefixHelper.deleteGuildPrefix(context.guild.id);

        return `The bot's prefix for this server has been reset to it's default: \`${context.main.prefixHelper.getDefaultPrefix()}\``;
      },
    },
    disable: {
      desc: 'disable the bot\'s server command prefix',
      permissions: 'ADMINISTRATOR',
      fn: async (context) => {
        if (context.guildPrefixDisabled) {
          return 'The bot\'s prefix for this server is already disabled.';
        }

        await context.main.prefixHelper.disableGuildPrefix(context.guild.id);

        return 'The bot\'s prefix for this server has been disabled.';
      },
    },
    enable: {
      desc: 'enable the bot\'s server command prefix',
      permissions: 'ADMINISTRATOR',
      fn: async (context) => {
        if (!context.guildPrefixDisabled) {
          return 'The bot\'s prefix for this server was not disabled before.';
        }

        await context.main.prefixHelper.enableGuildPrefix(context.guild.id);

        return 'The bot\'s prefix for this server has been enabled.';
      },
    },
  },
};


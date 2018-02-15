module.exports = {
  description: 'display or manages the bot\'s server command prefix',
  guildOnly: true,
  subcommands: {
    show: {
      description: 'displays the bot\'s current server command prefix',
      fn: async (context) => {
        if (context.guildPrefixDisabled) {
          return 'The prefix has been disabled for this server. To enable it, run `prefix enable`.';
        }

        return `The bot's current prefix for this server is \`${context.guildPrefix}\` ${(context.guildPrefix === context.main.prefixHelper.getDefaultPrefix()) ? '(This is the default prefix, to set a custom prefix run `prefix set`)' : ''}`;
      },
    },
    set: {
      description: 'sets the bot\'s server command prefix',
      permission: 'ADMINISTRATOR',
      arguments: [
        {
          label: 'prefix',
          type: 'string',
          max: 255,
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
      description: 'resets the bot\'s server command prefix to it\'s default value',
      permission: 'ADMINISTRATOR',
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
      description: 'disable the bot\'s server command prefix',
      permission: 'ADMINISTRATOR',
      fn: async (context) => {
        if (context.guildPrefixDisabled) {
          return 'The bot\'s prefix for this server is already disabled.';
        }

        await context.main.prefixHelper.disableGuildPrefix(context.guild.id);

        return 'The bot\'s prefix for this server has been disabled.';
      },
    },
    enable: {
      description: 'enable the bot\'s server command prefix',
      permission: 'ADMINISTRATOR',
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


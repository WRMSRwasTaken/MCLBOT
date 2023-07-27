module.exports = {
  description: 'Manage the leave messageCreate for left server members',
  guildOnly: true,
  fn: 'show',
  subcommands: {
    show: {
      description: 'Displays the current leave messageCreate',
      alias: ['print'],
      fn: async (ctx) => {
        const currentMessage = await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'leaveMessageText');
        const channelID = await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'welcomeLeaveMessageChannel');

        if (!currentMessage || !channelID) {
          return 'This server has no leave messageCreate set. Run `leave set` to enable this feature.';
        }

        if (!ctx.guild.channels.get(channelID)) {
          return `The currently set channel with ID \`${channelID}\` could not be found on this server, welcome and leave messages are disabled. To fix this, run \`leave setchannel\`.`;
        }

        if (!ctx.guild.channels.get(channelID).permissionsFor(ctx.guild.me).has('SEND_MESSAGES')) {
          return `I don't have the permission to post welcome and leave messages in the currently set channel: <#${channelID}>. Welcome and leave messages are disabled.`;
        }

        return `The current leave message will be posted in channel <#${channelID}> and is:\n\n${currentMessage}`;
      },
    },
    set: {
      description: 'Sets a new leave messageCreate',
      permission: 'ADMINISTRATOR',
      arguments: [
        {
          label: 'message',
          type: 'string',
          max: 1500,
          infinite: true,
        },
      ],
      fn: async (ctx, message) => {
        await ctx.main.guildSettingsManager.setGuildSetting(ctx.guild.id, 'leaveMessageText', message);

        if (!await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'welcomeLeaveMessageChannel')) {
          await ctx.main.guildSettingsManager.setGuildSetting(ctx.guild.id, 'welcomeLeaveMessageChannel', ctx.channel.id);
        }

        return `Successfully updated the server leave message.${(new RegExp('{mention}', 'gi').test(message) ? '\n\nNote: putting `{mention}` inside the leave messageCreate will result in `@invalid-user` being mentioned.' : '')}`;
      },
    },
    clear: {
      description: 'Disable the leave messageCreate',
      permission: 'ADMINISTRATOR',
      alias: ['delete', 'remove', 'off', 'disable'],
      fn: async (ctx) => {
        if (!await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'leaveMessageText')) {
          return 'This server has no leave messageCreate set.';
        }

        await ctx.main.guildSettingsManager.deleteGuildSetting(ctx.guild.id, 'leaveMessageText');

        if (!await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'welcomeMessageText')) {
          await ctx.main.guildSettingsManager.deleteGuildSetting(ctx.guild.id, 'welcomeLeaveMessageChannel');
        }

        return 'The leave messageCreate has been disabled for this server.';
      },
    },
    setchannel: {
      description: 'Set the channel where welcome and leave messages will be posted',
      permission: 'ADMINISTRATOR',
      arguments: [
        {
          type: 'channel',
        },
      ],
      fn: async (ctx, channel) => {
        if (!ctx.guild.channels.get(channel.id).permissionsFor(ctx.guild.me).has('SEND_MESSAGES')) {
          return ctx.main.stringUtils.argumentError(ctx, 0, `I don't have the permission to post messages in the channel <#${channel.id}>`);
        }

        await ctx.main.guildSettingsManager.setGuildSetting(ctx.guild.id, 'welcomeLeaveMessageChannel', channel.id);

        return `The new channel for welcome and leave message messages has been set to <#${channel.id}>.`;
      },
    },
  },
};

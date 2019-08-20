module.exports = {
  description: 'Manage the welcome message for newly joined server members',
  guildOnly: true,
  fn: 'show',
  subcommands: {
    show: {
      description: 'Displays the current welcome message',
      alias: ['print'],
      fn: async (ctx) => {
        const currentMessage = await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'welcomeMessageText');
        const channelID = await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'welcomeLeaveMessageChannel');

        if (!currentMessage || !channelID) {
          return 'This server has no welcome message set. Run `welcome set` to enable this feature.';
        }

        if (!ctx.guild.channels.get(channelID)) {
          return `The currently set channel with ID \`${channelID}\` could not be found on this server, welcome and leave messages are disabled. To fix this, run \`welcome setchannel\`.`;
        }

        if (!ctx.guild.channels.get(channelID).permissionsFor(ctx.guild.me).has('SEND_MESSAGES')) {
          return `I don't have the permission to post welcome and leave messages in the currently set channel: <#${channelID}>. Welcome and leave messages are disabled.`;
        }

        return `The current welcome message will be posted in channel <#${channelID}> and is:\n\n${currentMessage}`;
      },
    },
    set: { // TODO: create a listener for channelDelete and delete the welcome & leave message setting, if the currently set channel got deleted
      description: 'Sets a new welcome message',
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
        await ctx.main.guildSettingsManager.setGuildSetting(ctx.guild.id, 'welcomeMessageText', message);

        if (!await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'welcomeLeaveMessageChannel')) {
          await ctx.main.guildSettingsManager.setGuildSetting(ctx.guild.id, 'welcomeLeaveMessageChannel', ctx.channel.id);
        }

        return 'Successfully updated the server welcome message.';
      },
    },
    clear: {
      description: 'Disable the welcome message',
      permission: 'ADMINISTRATOR',
      alias: ['delete', 'remove', 'off', 'disable'],
      fn: async (ctx) => {
        if (!await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'welcomeMessageText')) {
          return 'This server has no welcome message set.';
        }

        await ctx.main.guildSettingsManager.deleteGuildSetting(ctx.guild.id, 'welcomeMessageText');

        if (!await ctx.main.guildSettingsManager.getGuildSetting(ctx.guild.id, 'leaveMessageText')) {
          await ctx.main.guildSettingsManager.deleteGuildSetting(ctx.guild.id, 'welcomeLeaveMessageChannel');
        }

        return 'The welcome message has been disabled for this server.';
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

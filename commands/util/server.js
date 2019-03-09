const XRegExp = require('xregexp');

const guildIDRegex = XRegExp('^\\d{16,}$');

module.exports = {
  description: 'Prints information about the corrent or a given Discord server / guild',
  alias: ['serverinfo', 's', 'guild', 'g', 'guildinfo'],
  arguments: [
    {
      label: 'guild id',
      type: 'string',
      optional: true,
    },
  ],
  fn: async (ctx, guildID) => {
    if (!ctx.guild && !guildID) {
      return 'This command can\'t be executed in DM without providing a server / guild ID.';
    }

    if (guildID && !XRegExp.exec(guildID, guildIDRegex)) {
      return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid server / guild ID');
    }

    let guild;

    if (!guildID || ctx.main.api.guilds.get(guildID)) { // use local RPC helper to retrieve guild information, since we're already on this shard
      guild = ctx.main.rpcHelper.getGuildInformation(guildID || ctx.guild.id);
    } else if (ctx.main.api.shard) {
      const rpcGuilds = await ctx.main.api.shard.broadcastEval(`this.main.rpcHelper.getGuildInformation('${guildID}')`);

      for (const rpcGuild of rpcGuilds) {
        if (rpcGuild) {
          guild = rpcGuild;

          break;
        }
      }
    }

    if (!guild) {
      return ctx.main.stringUtils.argumentError(ctx, 0, 'Unknown server / guild ID (I have to be on that server to retrieve information about it)');
    }

    const isLocal = (ctx.guild && ctx.guild.id === guildID) || (ctx.guild && !guildID);

    const embed = new ctx.main.Discord.MessageEmbed();

    embed.setAuthor(guild.name, guild.iconURL);

    embed.setThumbnail(guild.iconURL);

    embed.addField('ID', guild.id, true);

    embed.addField('Region', guild.region, true);

    embed.addField('Owner', (isLocal) ? `<@${guild.owner.id}>` : `${guild.owner.tag} (ID: ${guild.owner.id})`, true);

    const verificationLevels = ['none', 'low', 'medium', 'tableflip', 'double-tableflip'];

    embed.addField('Verfication level', verificationLevels[guild.verificationLevel], true);

    embed.addField('Created', ctx.main.stringUtils.formatUnixTimestamp(guild.createdTimestamp));

    embed.addField(`Members (${guild.members.total})`, `Online: ${guild.members.online}, Offline: ${guild.members.total - guild.members.online}`, true);

    embed.addField(`Channels (${guild.channels.text + guild.channels.voice})`, `Text: ${guild.channels.text}, Voice: ${guild.channels.voice}`, true);

    embed.addField('Default channel', (isLocal) ? `<#${guild.defaultChannel.id}>` : `#${guild.defaultChannel.name}`, true);

    embed.addField('Roles', guild.roles, true);

    let emojiRowContinued = false;
    let animatedEmojiRowContinued = false;

    if (guild.emojis.emojis.length > 0) {
      let emojiRow = '';

      for (const emoji of guild.emojis.emojis) {
        if (emojiRow.length + emoji.length > 1024) {
          embed.addField(`Emojis (${(emojiRowContinued) ? 'cont’d' : `Total: ${guild.emojis.emojis.length}`})`, emojiRow);

          emojiRowContinued = true;

          emojiRow = '';
        }

        emojiRow += emoji;
      }

      embed.addField(`Emojis (${(emojiRowContinued) ? 'cont’d' : `Total: ${guild.emojis.emojis.length}`})`, emojiRow);
    }

    if (guild.emojis.animated.length > 0) {
      let emojiRow = '';

      for (const emoji of guild.emojis.animated) {
        if (emojiRow.length + emoji.length > 1024) {
          embed.addField(`Animated emojis (${(animatedEmojiRowContinued) ? 'cont’d' : `Total: ${guild.emojis.animated.length}`})`, emojiRow);

          animatedEmojiRowContinued = true;

          emojiRow = '';
        }

        emojiRow += emoji;
      }

      embed.addField(`Animated emojis (${(animatedEmojiRowContinued) ? 'cont’d' : `Total: ${guild.emojis.animated.length}`})`, emojiRow);
    }

    return ctx.reply({
      embed,
    });
  },
};

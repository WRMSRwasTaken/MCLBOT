module.exports = {
  description: 'prints information the current discord server',
  alias: ['serverinfo', 's', 'guild', 'g'],
  guildOnly: true,
  arguments: [
    {
      label: 'guild id',
      type: 'string',
      optional: true,
    },
  ],
  fn: async (ctx, guildID) => {
    let guild;

    if (!guildID) {
      guild = ctx.guild;
    } else if (!ctx.main.api.guilds.get(guildID)) {
      return ctx.main.stringUtils.argumentError(ctx, 0, 'Unknown server / guild ID (I have to be on that server to retrieve information about it)');
    } else {
      guild = ctx.main.api.guilds.get(guildID); // TODO: add a switch to make args in DM mandatory
    }


    const embed = new ctx.main.Discord.MessageEmbed();

    embed.setAuthor(guild.name, guild.iconURL());

    embed.setThumbnail(guild.iconURL());

    embed.addField('ID', guild.id, true);
    embed.addField('Region', guild.region, true);
    embed.addField('Owner', `<@${guild.ownerID}>`, true); // TODO: this fails for users not on the target server

    const verificationLevels = ['none', 'low', 'medium', 'tableflip', 'double-tableflip'];

    embed.addField('Verfication level', verificationLevels[guild.verificationLevel], true);

    embed.addField('Created', ctx.main.stringUtils.formatUnixTimestamp(guild.createdTimestamp));

    let memberOnline = 0;

    for (const member of guild.members.values()) {
      if (member.presence) {
        if (member.presence.status !== 'offline') memberOnline += 1;
      }
    }

    embed.addField(`Members (${guild.memberCount})`, `Online: ${memberOnline}, Offline: ${guild.memberCount - memberOnline}`, true);

    let textChannels = 0;
    let voiceChannels = 0;

    const defaultChannel = guild.channels.filter((channel) => {
      if (channel.type === 'text') textChannels += 1;
      if (channel.type === 'voice') voiceChannels += 1;

      return (channel.permissionsFor(guild.me).has('VIEW_CHANNEL') && channel.type === 'text');
    }).sort((c1, c2) => c1.rawPosition - c2.rawPosition).first();

    embed.addField(`Channels (${textChannels + voiceChannels})`, `Text: ${textChannels}, Voice: ${voiceChannels}`, true);

    embed.addField('Default channel', (defaultChannel) ? `<#${defaultChannel.id}>` : 'N/A', true); // TODO: this fails for users not on the target server

    embed.addField('Roles', guild.roles.size, true);

    let emojiString = '';
    let animatedEmojiString = '';

    let countEmojis = 0;
    let totalEmojis = 0;

    let countAnimatedEmojis = 0;
    let totalAnimatedEmojis = 0;

    let moreEmojis = false;
    let moreAnimatedEmojis = false;

    if (guild.emojis.size) {
      for (const emoji of guild.emojis.values()) {
        const newEmoji = emoji.toString();

        if (emoji.animated) {
          if (animatedEmojiString.length + newEmoji.length <= 1024) {
            animatedEmojiString += newEmoji;
            countAnimatedEmojis += 1;
          } else {
            moreAnimatedEmojis = true;
          }

          totalAnimatedEmojis += 1;
        } else {
          if (emojiString.length + newEmoji.length <= 1024) {
            emojiString += newEmoji;
            countEmojis += 1;
          } else {
            moreEmojis = true;
          }

          totalEmojis += 1;
        }
      }

      if (countEmojis) {
        embed.addField(`Emojis (${totalEmojis})${(moreEmojis) ? ` (only the first ${countEmojis} are shown)` : ''}`, emojiString);
      }

      if (countAnimatedEmojis) {
        embed.addField(`Animated emojis (${totalAnimatedEmojis})${(moreAnimatedEmojis) ? ` (only the first ${countAnimatedEmojis} are shown)` : ''}`, animatedEmojiString);
      }
    }

    ctx.reply({
      embed,
    });
  },
};

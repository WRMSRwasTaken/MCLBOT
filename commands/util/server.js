module.exports = {
  description: 'prints information the current discord server',
  alias: ['serverinfo', 's', 'guild', 'g'],
  guildOnly: true,
  fn: async (ctx) => {
    const embed = new ctx.main.Discord.MessageEmbed();

    embed.author = {
      name: ctx.guild.name,
      icon_url: ctx.guild.iconURL(),
    };

    embed.setThumbnail(ctx.guild.iconURL());

    embed.addField('ID', ctx.guild.id, true);
    embed.addField('Region', ctx.guild.region, true);
    embed.addField('Owner', `<@${ctx.guild.ownerID}>`, true);

    const verificationLevels = ['none', 'low', 'medium', 'tableflip', 'double-tableflip'];

    embed.addField('Verfication level', verificationLevels[ctx.guild.verificationLevel], true);

    embed.addField('Created', ctx.main.stringUtils.formatUnixTimestamp(ctx.guild.createdTimestamp));

    let memberOnline = 0;

    ctx.guild.members.forEach((member) => {
      if (member.presence.status !== 'offline') memberOnline += 1;
    });

    embed.addField(`Members (${ctx.guild.memberCount})`, `Online: ${memberOnline}, Offline: ${ctx.guild.memberCount - memberOnline}`, true);

    let textChannels = 0;
    let voiceChannels = 0;

    const defaultChannel = ctx.guild.channels.filter((channel) => {
      if (channel.type === 'text') textChannels += 1;
      if (channel.type === 'voice') voiceChannels += 1;

      return (channel.permissionsFor(ctx.guild.me).has('VIEW_CHANNEL') && channel.type === 'text');
    }).sort((c1, c2) => c1.position - c2.position).first();

    embed.addField(`Channels (${textChannels + voiceChannels})`, `Text: ${textChannels}, Voice: ${voiceChannels}`, true);

    embed.addField('Default channel', (defaultChannel) ? `<#${defaultChannel.id}>` : 'N/A', true);

    embed.addField('Roles', ctx.guild.roles.size, true);

    let emojiString = '';
    let countEmojis = 0;
    let moreEmojis = false;

    if (ctx.guild.emojis.size) {
      ctx.guild.emojis.forEach((emoji) => {
        const newEmoji = `<:${emoji.name}:${emoji.id}>`;
        if (emojiString.length + newEmoji.length <= 1024) {
          emojiString += newEmoji;
          countEmojis += 1;
        } else {
          moreEmojis = true;
        }
      });

      embed.addField(`Emojis (${ctx.guild.emojis.size})${(moreEmojis) ? ` (only the first ${countEmojis} are shown)` : ''}`, emojiString);
    }

    ctx.reply({
      embed,
    });
  },
};

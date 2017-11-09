module.exports = {
  desc: 'prints information the current discord server',
  alias: ['serverinfo', 's'],
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
    embed.addField('Owner', `<@${ctx.guild.owner.id}>`, true);

    const verificationLevels = ['none', 'low', 'medium', 'tableflip', 'double-tableflip'];

    embed.addField('Verfication level', verificationLevels[ctx.guild.verificationLevel], true);

    embed.addField('Created', ctx.main.stringUtils.formatUnixTimestamp(ctx.guild.createdTimestamp));

    let memberOffline = 0;
    let memberOnline = 0;

    ctx.guild.members.forEach((member) => {
      if (member.presence.status === 'offline') memberOffline += 1;
      else memberOnline += 1;
    });

    embed.addField('Members', `Online: ${memberOnline}, Offline: ${memberOffline} (${ctx.guild.memberCount} total)`, true);

    let textChannels = 0;
    let voiceChannels = 0;

    const defaultChannel = ctx.guild.channels.filter((channel) => {
      if (channel.type === 'text') textChannels += 1;
      else voiceChannels += 1;

      return (channel.permissionsFor(ctx.guild.me).has('READ_MESSAGES'));
    }).sort((c1, c2) => c1.position - c2.position).first();

    embed.addField('Channels', `Text: ${textChannels}, Voice: ${voiceChannels} (${textChannels + voiceChannels} total)`, true);

    embed.addField('Default channel', `<#${defaultChannel.id}>`, true);

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

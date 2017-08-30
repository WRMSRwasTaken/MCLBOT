module.exports = {
  desc: 'prints information the current discord server',
  alias: ['serverinfo', 's'],
  noDM: true,
  fn: async (message, param, main) => {
    const embed = new main.Discord.MessageEmbed();

    embed.author = {
      name: message.guild.name,
      icon_url: message.guild.iconURL,
    };

    embed.setThumbnail(message.guild.iconURL);

    embed.addField('ID', message.guild.id);
    embed.addField('Owner', `<@${message.guild.owner.id}>`);
    embed.addField('Region', message.guild.region);
    embed.addField('Created', this.main.stringUtils.formatUnixTimestamp(message.guild.createdTimestamp));

    let memberOffline = 0;
    let memberOnline = 0;

    message.guild.members.forEach((member) => {
      if (member.presence.status === 'offline') memberOffline += 1;
      else memberOnline += 1;
    });

    embed.addField('Members', `Online: ${memberOnline}, Offline: ${memberOffline} (${message.guild.memberCount} total)`);

    const verificationLevels = ['none', 'low', 'medium', 'tableflip', 'double-tableflip'];

    embed.addField('Verfication level', verificationLevels[message.guild.verificationLevel]);

    let textChannels = 0;
    let voiceChannels = 0;

    const defaultChannel = message.guild.channels.filter((channel) => {
      if (channel.type === 'text') textChannels += 1;
      else voiceChannels += 1;

      return (channel.permissionsFor(message.guild.me).has('READ_MESSAGES'));
    }).sort((c1, c2) => c1.position - c2.position).first();

    embed.addField('Channels', `Text: ${textChannels}, Voice: ${voiceChannels} (${textChannels + voiceChannels} total)`);

    embed.addField('Default channel', `<#${defaultChannel.id}>`);

    embed.addField('Roles', message.guild.roles.size);

    let emojiString = '';
    let countEmojis = 0;
    let moreEmojis = false;

    if (message.guild.emojis.size) {
      message.guild.emojis.forEach((emoji) => {
        const newEmoji = `<:${emoji.name}:${emoji.id}>`;
        if (emojiString.length + newEmoji.length <= 1024) {
          emojiString += newEmoji;
          countEmojis += 1;
        } else {
          moreEmojis = true;
        }
      });

      embed.addField(`Emojis (${message.guild.emojis.size})${(moreEmojis) ? ` (only the first ${countEmojis} are shown)` : ''}`, emojiString);
    }

    message.send({
      embed,
    });
  },
};

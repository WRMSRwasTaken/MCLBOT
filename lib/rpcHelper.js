class RPCHelper {
  constructor(main) {
    this.main = main;
  }

  getGuildInformation(guildID) {
    const guild = this.main.api.guilds.get(guildID);

    if (!guild) {
      return false;
    }

    let memberOnline = 0;

    for (const member of guild.members.values()) {
      if (member.presence) {
        if (member.presence.status !== 'offline') memberOnline += 1;
      }
    }

    let textChannels = 0;
    let voiceChannels = 0;

    const defaultChannel = guild.channels.filter((channel) => {
      if (channel.type === 'text') textChannels += 1;
      if (channel.type === 'voice') voiceChannels += 1;

      return (channel.permissionsFor(guild.me).has('VIEW_CHANNEL') && channel.type === 'text');
    }).sort((c1, c2) => c1.rawPosition - c2.rawPosition).first();

    const emojis = [];
    const animated = [];

    if (guild.emojis.size) {
      for (const emoji of guild.emojis.values()) {
        const newEmoji = emoji.toString();

        if (emoji.animated) {
          animated.push(newEmoji);
        } else {
          emojis.push(newEmoji);
        }
      }
    }

    return {
      name: guild.name,
      id: guild.id,
      iconURL: guild.iconURL(),
      region: guild.region,
      owner: (guild.owner) ? {
        id: guild.owner.user.id,
        tag: guild.owner.user.tag,
      } : false,
      verificationLevel: guild.verificationLevel,
      createdTimestamp: guild.createdTimestamp,
      members: {
        total: guild.memberCount,
        online: memberOnline,
      },
      channels: {
        text: textChannels,
        voice: voiceChannels,
      },
      defaultChannel: {
        name: defaultChannel.name,
        id: defaultChannel.id,
      },
      roles: guild.roles.size,
      emojis: {
        animated,
        emojis,
      },
    };
  }
}

module.exports = RPCHelper;

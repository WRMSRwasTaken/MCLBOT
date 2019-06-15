class RPCHelper {
  constructor(main) {
    this.main = main;
  }

  getGuildInformation(guildID) {
    const guild = this.main.api.guilds.get(guildID);

    if (!guild) {
      return false;
    }

    let botsOnline = 0;
    let botsTotal = 0;
    let humansOnline = 0;

    for (const member of guild.members.values()) {
      if (member.user.bot) {
        if (member.presence.status !== 'offline') {
          botsOnline += 1;
        }

        botsTotal += 1;
      } else if (member.presence.status !== 'offline') {
        humansOnline += 1;
      }
    }

    let textChannels = 0;
    let voiceChannels = 0;
    let categoryChannels = 0;

    const defaultChannel = guild.channels.filter((channel) => {
      if (channel.type === 'text') textChannels += 1;
      if (channel.type === 'voice') voiceChannels += 1;
      if (channel.type === 'category') categoryChannels += 1;

      return (channel.permissionsFor(guild.me).has('VIEW_CHANNEL') && channel.type === 'text');
    }).sort((c1, c2) => c1.rawPosition - c2.rawPosition).first();

    const animatedEmojiCount = guild.emojis.filter(e => e.animated).size;

    return {
      name: guild.name,
      id: guild.id,
      iconURL: guild.iconURL(),
      region: guild.region,
      owner: (guild.owner) ? {
        id: guild.owner.user.id,
        tag: guild.owner.user.tag,
      } : false,
      security: {
        verificationLevel: guild.verificationLevel,
        mfaRequired: !!guild.mfaLevel,
        explicitContentFilter: guild.explicitContentFilter,
      },
      features: guild.features,
      createdTimestamp: guild.createdTimestamp,
      members: {
        humans: {
          online: humansOnline,
          total: guild.memberCount - botsTotal, // we're cheating here a bit and assume that all other missing presences are humans
        },
        bots: {
          online: botsOnline,
          total: botsTotal,
        },
      },
      channels: {
        text: textChannels,
        voice: voiceChannels,
        category: categoryChannels,
      },
      emoji: {
        regular: guild.emojis.size - animatedEmojiCount,
        animated: animatedEmojiCount,
      },
      other: {
        roles: guild.roles.size,
        defaultChannel: {
          name: defaultChannel.name,
          id: defaultChannel.id,
        },
        systemChannel: (guild.systemChannel) ? {
          name: guild.systemChannel.name,
          id: guild.systemChannel.id,
        } : false,
        shard: (this.main.api.shard) ? this.main.api.shard.ids[0] : false,
      },
      nitro: {
        boosters: guild.premiumSubscriptionCount,
        level: guild.premiumTier,
      },
    };
  }
}

module.exports = RPCHelper;

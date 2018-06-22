const activities = {
  PLAYING: 'Playing',
  STREAMING: 'Streaming',
  LISTENING: 'Listening to',
  WATCHING: 'Watching',
};

module.exports = {
  description: 'prints information about a discord user',
  alias: ['userinfo', 'u'],
  arguments: [
    {
      label: 'user',
      type: 'user',
      infinite: true,
      optional: true,
    },
  ],
  flags: {
    stats: {
      label: 'statistics',
      short: 's',
    },
  },
  fn: async (ctx, user) => {
    let guildMember;

    if (ctx.guild) {
      guildMember = ctx.guild.members.get(user.id);
    }

    const embed = new ctx.main.Discord.MessageEmbed();

    embed.setAuthor(user.tag, user.displayAvatarURL());

    embed.setThumbnail(user.displayAvatarURL());

    if (guildMember && guildMember.displayHexColor) {
      embed.setColor(guildMember.displayHexColor);
    }

    embed.addField('ID', user.id, true);
    embed.addField('Tag', user.tag, true);
    if (guildMember && guildMember.nickname) embed.addField('Nickname', guildMember.nickname, true);
    if (user.presence.status) embed.addField('Status', user.presence.status, true);
    if (user.presence.activity) embed.addField(activities[user.presence.activity.type], user.presence.activity.name, true);

    const lastSeen = await ctx.main.redis.get(`user_last_seen:${user.id}`);

    ctx.main.prometheusMetrics.redisReads.inc();

    if (lastSeen) {
      const time = ctx.main.stringUtils.formatUnixTimestamp(parseInt(lastSeen, 10));

      if (user.presence.status === 'offline' || !user.presence.status) {
        embed.addField('Last time seen', time);
      } else {
        embed.addField('Last time offline', time);
      }
    }

    if (guildMember && guildMember.id !== ctx.main.api.user.id && user.id !== ctx.author.id) {
      const timestamp = await ctx.main.userHelper.getLastMessageTimestamp(ctx, guildMember);

      if (timestamp) {
        embed.addField('Last message', ctx.main.stringUtils.formatUnixTimestamp(timestamp));
      }
    }

    if (guildMember && guildMember.joinedTimestamp) {
      embed.addField('Guild join date', ctx.main.stringUtils.formatUnixTimestamp(guildMember.joinedTimestamp));
    }

    embed.addField('Discord join date', ctx.main.stringUtils.formatUnixTimestamp(user.createdTimestamp));

    if (guildMember) {
      embed.addField(`Roles (${guildMember.roles.size})`, guildMember.roles.sort((r1, r2) => r1.position - r2.position).map(role => role.name).join(', '));
    }

    ctx.reply({
      embed,
    });
  },
};

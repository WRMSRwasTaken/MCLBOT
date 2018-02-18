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
      optional: true,
    },
  ],
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
    if (user.presence.status === 'offline' || !user.presence.status) {
      const lastSeen = await ctx.main.redis.get(`user_last_seen:${user.id}`);

      ctx.main.prometheusMetrics.redisReads.inc();

      if (lastSeen) embed.addField('Last seen', ctx.main.stringUtils.formatUnixTimestamp(parseInt(lastSeen, 10)));
    }

    if (guildMember && guildMember.user.id !== ctx.main.api.user.id && user.id !== ctx.author.id) {
      let timestamp;

      if (guildMember.lastMessage) {
        timestamp = guildMember.lastMessage.createdTimestamp;
      } else {
        timestamp = await ctx.main.redis.get(`member_last_message:${ctx.guild.id}:${user.id}`);

        ctx.main.prometheusMetrics.redisReads.inc();

        if (timestamp) {
          timestamp = parseInt(timestamp, 10);
        }
      }

      if (timestamp) {
        embed.addField('Last message', ctx.main.stringUtils.formatUnixTimestamp(timestamp));
      }
    }
    if (guildMember) embed.addField('Guild join date', ctx.main.stringUtils.formatUnixTimestamp(guildMember.joinedTimestamp));
    embed.addField('Discord join date', ctx.main.stringUtils.formatUnixTimestamp(user.createdTimestamp));
    if (guildMember) {
      embed.addField(`Roles (${guildMember.roles.size})`, guildMember.roles.map(role => role.name).join(', '));
    }

    ctx.reply({
      embed,
    });
  },
};

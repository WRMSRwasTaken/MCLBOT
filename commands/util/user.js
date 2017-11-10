module.exports = {
  desc: 'prints information about a discord user',
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

    embed.author = {
      name: user.tag,
      icon_url: user.displayAvatarURL(),
    };

    embed.setThumbnail(user.displayAvatarURL());

    embed.addField('ID', user.id, true);
    embed.addField('Tag', user.tag, true);
    if (guildMember && guildMember.nickname) embed.addField('Nickname', guildMember.nickname, true);
    if (user.presence.status) embed.addField('Status', user.presence.status, true);
    if (user.presence.activity) embed.addField('Playing', user.presence.activity.name, true);
    if (user.presence.status === 'offline' || !user.presence.status) {
      const lastSeen = await ctx.main.redis.get(`user_last_seen:${user.id}`);

      if (lastSeen) embed.addField('Last seen', ctx.main.stringUtils.formatUnixTimestamp(parseInt(lastSeen, 10)));
    }

    if (guildMember && guildMember.lastMessage && guildMember.user.id !== ctx.main.api.user.id) embed.addField('Last message', ctx.main.stringUtils.formatUnixTimestamp(guildMember.lastMessage.createdTimestamp)); // TODO: fallback to SQL
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

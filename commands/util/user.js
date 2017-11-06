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

    let lastSeen;

    if (!user.presence.status) {
      lastSeen = await ctx.main.redis.get(`user_last_seen:${user.id}`);
    }

    embed.setThumbnail(user.displayAvatarURL());

    embed.addField('ID', user.id);
    embed.addField('Tag', user.tag);
    if (guildMember && guildMember.nickname) embed.addField('Nickname', guildMember.nickname);
    if (user.presence.status) embed.addField('Status', user.presence.status);
    if (user.presence.game) embed.addField('Playing', user.presence.game.name);
    if (!user.presence.status && lastSeen) embed.addField('Last seen', ctx.main.stringUtils.formatUnixTimestamp(lastSeen));
    if (guildMember && user.id !== ctx.message.author.id && guildMember.lastMessage) embed.addField('Last message', ctx.main.stringUtils.formatUnixTimestamp(guildMember.lastMessage.createdTimestamp)); // TODO: fallback to SQL
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

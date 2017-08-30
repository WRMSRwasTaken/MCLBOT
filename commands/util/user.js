module.exports = {
  desc: 'prints information about a discord user',
  alias: ['userinfo', 'u'],
  optArgs: ['user id | mention | user name/tag'],
  fn: async (message, param, main) => {
    let guildMember;
    let user;

    if (!main.commandHandler.isDM(message)) {
      if (!param) {
        guildMember = message.member;
      } else {
        guildMember = await main.userHelper.getGuildMember(message, param);
      }

      user = guildMember.user;
    }

    if (!guildMember) {
      if (!param) {
        user = message.author;
      } else {
        user = await main.userHelper.fetchUserFromAPI(param);
      }
    }

    if (!user && !guildMember) {
      return 'No user found.';
    }

    const embed = new main.Discord.MessageEmbed();

    embed.author = {
      name: user.tag,
      icon_url: user.displayAvatarURL(),
    };

    embed.setThumbnail(user.displayAvatarURL());

    embed.addField('ID', user.id);
    embed.addField('Tag', user.tag);
    if (guildMember && guildMember.nickname) embed.addField('Nickname', guildMember.nickname);
    embed.addField('Status', user.presence.status);
    if (user.presence.game) embed.addField('Playing', user.presence.game.name);
    if (guildMember && user.id !== message.author.id && guildMember.lastMessage) embed.addField('Last message', main.stringUtils.formatUnixTimestamp(guildMember.lastMessage.createdTimestamp)); // TODO: fallback to SQL
    if (guildMember) embed.addField('Guild join date', main.stringUtils.formatUnixTimestamp(guildMember.joinedTimestamp));
    embed.addField('Discord join date', main.stringUtils.formatUnixTimestamp(user.createdTimestamp));
    if (guildMember) {
      embed.addField(`Roles (${guildMember.roles.size})`, guildMember.roles.map(role => role.name).join(', '));
    }

    message.send({
      embed,
    });
  },
};

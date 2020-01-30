module.exports = {
  fn: async (main, GuildMemberAdd) => {
    if (GuildMemberAdd.isDuplicate) {
      return false;
    }

    if (GuildMemberAdd.member.user.bot) {
      return false;
    }

    let currentMessage = await main.guildSettingsManager.getGuildSetting(GuildMemberAdd.member.guild.id, 'welcomeMessageText');
    const channelID = await main.guildSettingsManager.getGuildSetting(GuildMemberAdd.member.guild.id, 'welcomeLeaveMessageChannel');

    if (!currentMessage || !channelID) {
      return false;
    }

    if (!GuildMemberAdd.member.guild.channels.get(channelID)) {
      return false;
    }

    if (!GuildMemberAdd.member.guild.channels.get(channelID).permissionsFor(GuildMemberAdd.member.guild.me).has('SEND_MESSAGES')) {
      return false;
    }

    const replacements = [
      {
        search: 'membercount',
        replace: GuildMemberAdd.member.guild.memberCount,
      },
      {
        search: 'servername',
        replace: GuildMemberAdd.member.guild.name,
      },
      {
        search: 'mention',
        replace: `<@${GuildMemberAdd.member.id}>`,
      },
      {
        search: 'username',
        replace: GuildMemberAdd.member.user.username,
      },
      {
        search: 'discriminator',
        replace: GuildMemberAdd.member.user.discriminator,
      },
      {
        search: 'tag',
        replace: GuildMemberAdd.member.user.tag,
      },
    ];

    for (const replacement of replacements) {
      currentMessage = currentMessage.replace(new RegExp(`{${replacement.search}}`, 'gi'), replacement.replace);
    }

    return GuildMemberAdd.member.guild.channels.get(channelID).send(currentMessage);
  },
};

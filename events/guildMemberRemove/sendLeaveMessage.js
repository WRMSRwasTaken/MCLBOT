module.exports = {
  fn: async (main, GuildMemberRemove) => {
    if (GuildMemberRemove.isDuplicate) {
      return false;
    }

    if (GuildMemberRemove.member.user.bot) {
      return false;
    }

    let currentMessage = await main.guildSettingsManager.getGuildSetting(GuildMemberRemove.member.guild.id, 'leaveMessageText');
    const channelID = await main.guildSettingsManager.getGuildSetting(GuildMemberRemove.member.guild.id, 'welcomeLeaveMessageChannel');

    if (!currentMessage || !channelID) {
      return false;
    }

    if (!GuildMemberRemove.member.guild.channels.get(channelID)) {
      return false;
    }

    if (!GuildMemberRemove.member.guild.channels.get(channelID).permissionsFor(GuildMemberRemove.member.guild.me).has('SEND_MESSAGES')) {
      return false;
    }

    const replacements = [
      {
        search: 'membercount',
        replace: GuildMemberRemove.member.guild.memberCount,
      },
      {
        search: 'servername',
        replace: GuildMemberRemove.member.guild.name,
      },
      {
        search: 'mention',
        replace: `<@${GuildMemberRemove.member.id}>`,
      },
      {
        search: 'username',
        replace: GuildMemberRemove.member.user.username,
      },
      {
        search: 'discriminator',
        replace: GuildMemberRemove.member.user.discriminator,
      },
      {
        search: 'tag',
        replace: GuildMemberRemove.member.user.tag,
      },
    ];

    for (const replacement of replacements) {
      currentMessage = currentMessage.replace(new RegExp(`{${replacement.search}}`, 'gi'), replacement.replace);
    }

    return GuildMemberRemove.member.guild.channels.get(channelID).send(currentMessage);
  },
};

module.exports = {
  fn: async (main, member) => {
    if (member.user.bot) {
      return false;
    }

    let currentMessage = await main.guildSettingsManager.getGuildSetting(member.guild.id, 'welcomeMessageText');
    const channelID = await main.guildSettingsManager.getGuildSetting(member.guild.id, 'welcomeLeaveMessageChannel');

    if (!currentMessage || !channelID) {
      return false;
    }

    if (!member.guild.channels.get(channelID)) {
      return false;
    }

    if (!member.guild.channels.get(channelID).permissionsFor(member.guild.me).has('SEND_MESSAGES')) {
      return false;
    }

    const replacements = [
      {
        search: 'membercount',
        replace: member.guild.memberCount,
      },
      {
        search: 'servername',
        replace: member.guild.name,
      },
      {
        search: 'mention',
        replace: `<@${member.id}>`,
      },
      {
        search: 'username',
        replace: member.user.username,
      },
      {
        search: 'discriminator',
        replace: member.user.discriminator,
      },
      {
        search: 'tag',
        replace: member.user.tag,
      },
    ];

    for (const replacement of replacements) {
      currentMessage = currentMessage.replace(new RegExp(`{${replacement.search}}`, 'gi'), replacement.replace);
    }

    return member.guild.channels.get(channelID).send(currentMessage);
  },
};

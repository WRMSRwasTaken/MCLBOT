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
      const roles = guildMember.roles.sort((r1, r2) => r1.position - r2.position);
      let rolesField = '';
      let rolesShown = 0;

      for (const role of roles.values()) {
        if (role.name === '@everyone') {
          continue; // eslint-disable-line no-continue
        }

        if (rolesField !== '') {
          rolesField += ', ';
        }

        if (rolesField.length + role.toString().length + 2 <= 1024) {
          rolesField += role.toString();
          rolesShown += 1;
        }
      }

      if (rolesShown > 0) {
        embed.addField(`Roles (${guildMember.roles.size - 1}) ${(guildMember.roles.size - 1 > rolesShown) ? ` (only the first ${rolesShown} are shown)` : ''}`, rolesField);
      }
    }

    if (user.id !== ctx.main.api.user.id) {
      let commonGuilds;

      if (ctx.main.api.shard) {
        const rpcGuilds = await ctx.main.api.shard.broadcastEval(`this.main.userHelper.getGuildsInCommon('${user.id}')`);

        commonGuilds = rpcGuilds.flat();
      } else {
        commonGuilds = ctx.main.userHelper.getGuildsInCommon(user.id);
      }

      let commonGuildsField = '';
      let commonGuildsShown = 0;

      for (const commonGuild of commonGuilds) {
        if (commonGuildsField !== '') {
          commonGuildsField += ', ';
        }

        if (commonGuildsField.length + commonGuild.length + 4 <= 1024) {
          commonGuildsField += `\`${commonGuild}\``;
          commonGuildsShown += 1;
        }
      }

      if (commonGuildsShown > 0) {
        embed.addField(`Seen on (${commonGuilds.length}) ${(commonGuilds.length > commonGuildsShown) ? ` (only the first ${commonGuildsShown} are shown)` : ''}`, commonGuildsField);
      }
    }

    ctx.reply({
      embed,
    });
  },
};

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
    if (user.presence.status) embed.addField('Status', user.presence.status, true); // TODO: hide this, if we don't have any common guilds with this user, as the presence will be unknown then thus always displaying offline
    if (user.presence.activity) embed.addField(activities[user.presence.activity.type], user.presence.activity.name, true);

    if (ctx.guild && user.id !== ctx.main.api.user.id && user.id !== ctx.author.id) {
      ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
      const lastMessage = await ctx.main.db.member_messages.findOne({
        where: {
          guild_id: ctx.guild.id,
          user_id: user.id,
        },
        order: [['timestamp', 'desc']],
      });

      if (lastMessage) {
        if (lastMessage.channel_id === ctx.channel.id) {
          embed.addField('Last message on this Server (and also this Channel)', ctx.main.stringUtils.formatUnixTimestamp(lastMessage.timestamp, 0, true, true));
        } else {
          ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
          const lastChannelMessage = await ctx.main.db.member_messages.findOne({
            where: {
              guild_id: ctx.guild.id,
              channel_id: ctx.channel.id,
              user_id: user.id,
            },
            order: [['timestamp', 'desc']],
          });

          if (lastChannelMessage) {
            embed.addField('Last message in this Channel', ctx.main.stringUtils.formatUnixTimestamp(lastChannelMessage.timestamp, 0, true, true));
          }

          embed.addField('Last message on this Server', ctx.main.stringUtils.formatUnixTimestamp(lastMessage.timestamp, 0, true, true));
        }
      }
    }

    if (guildMember) {
      let joinText;

      if (guildMember.joinedTimestamp) {
        joinText = ctx.main.stringUtils.formatUnixTimestamp(guildMember.joinedTimestamp, 0, true, true);
      } else { // for some reason this is not set sometimes so just get it from the database
        ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
        const lastJoin = await ctx.main.db.member_events.findOne({
          where: {
            guild_id: ctx.guild.id,
            user_id: user.id,
            type: 'JOIN',
          },
          order: [['timestamp', 'desc']],
        });

        if (lastJoin) {
          joinText = ctx.main.stringUtils.formatUnixTimestamp(lastJoin.timestamp, 0, true, true);
        }
      }

      ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
      const joinCount = await ctx.main.db.member_events.count({
        where: {
          guild_id: ctx.guild.id,
          user_id: user.id,
          type: 'JOIN',
        },
      });

      if (joinCount > 1) {
        joinText = `${joinText}\n\nUser rejoined this server ${joinCount - 1} time${(joinCount - 1 > 1) ? 's' : ''} already.`;
      }

      if (joinText) {
        embed.addField('Server join date', joinText);
      }
    } else if (ctx.guild) {
      ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
      const leaveCount = await ctx.main.db.member_events.count({
        where: {
          guild_id: ctx.guild.id,
          user_id: user.id,
          type: 'LEAVE',
        },
      });

      if (leaveCount) {
        ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
        const lastLeave = await ctx.main.db.member_events.findOne({
          where: {
            guild_id: ctx.guild.id,
            user_id: user.id,
            type: 'LEAVE',
          },
          order: [['timestamp', 'desc']],
        });

        let leaveText = ctx.main.stringUtils.formatUnixTimestamp(lastLeave.timestamp, 0, true, true);

        if (leaveCount > 1) {
          leaveText = `${leaveText}\n\nUser left this server ${leaveCount} times already.`;
        }

        embed.addField('Server leave date', leaveText);
      }
    }

    if (guildMember && guildMember.premiumSince) {
      embed.addField('Nitro booster since', ctx.main.stringUtils.formatUnixTimestamp(guildMember.premiumSinceTimestamp, 0, true, true));
    }

    embed.addField('Discord join date', ctx.main.stringUtils.formatUnixTimestamp(user.createdTimestamp, 0, true, true));

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

const prettyMs = require('pretty-ms');

module.exports = {
  description: 'Prints member messageCreate statistics about this server',
  alias: ['top', 'serverstats', 'sstats', 'guildstats', 'gstats'],
  guildOnly: true,
  flags: {
    timespan: {
      type: 'duration',
      short: 'd',
      max: 31536000,
    },
    channel: {
      type: 'channel',
      short: 'c',
    },
  },
  fn: async (ctx, flags) => {
    const timespan = flags.timespan || 86400;

    const Op = ctx.main.db.Sequelize.Op;

    const embed = new ctx.main.Discord.MessageEmbed();

    embed.setThumbnail(ctx.guild.iconURL());

    embed.setAuthor(ctx.guild.name);

    embed.setTitle(`Top users and channels for the past ${prettyMs(timespan * 1000, { verbose: true })}\n*(Set-able with the \`-d\` flag)*`);

    ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const totalMessages = await ctx.main.db.member_messages.count({
      where: {
        guild_id: ctx.guild.id,
        timestamp: {
          [Op.gte]: Date.now() - timespan * 1000,
        },
      },
    });

    embed.addField('Total server messages', totalMessages, true);

    ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const memberJoinLeaveCount = await ctx.main.db.member_events.findAll({
      where: {
        guild_id: ctx.guild.id,
        timestamp: {
          [Op.gte]: Date.now() - timespan * 1000,
        },
      },
      attributes: [
        'type',
        ctx.main.db.sequelize.fn('count', ctx.main.db.sequelize.col('type')),
      ],
      group: ['type'],
      raw: true,
    });

    let membersJoined = 0;
    let membersLeft = 0;

    if (memberJoinLeaveCount[0]) {
      if (memberJoinLeaveCount[0].type === 'JOIN') {
        membersJoined = memberJoinLeaveCount[0].count;
      } else {
        membersLeft = memberJoinLeaveCount[0].count;
      }
    }

    if (memberJoinLeaveCount[1]) {
      if (memberJoinLeaveCount[1].type === 'JOIN') {
        membersJoined = memberJoinLeaveCount[1].count;
      } else {
        membersLeft = memberJoinLeaveCount[1].count;
      }
    }

    embed.addField('Member delta', `Joined: ${membersJoined}\nLeft: ${membersLeft}`, true);

    ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const userStats = await ctx.main.db.member_messages.findAll({
      where: {
        guild_id: ctx.guild.id,
        timestamp: {
          [Op.gte]: Date.now() - timespan * 1000,
        },
      },
      attributes: [
        'user_id',
        ctx.main.db.sequelize.fn('count', ctx.main.db.sequelize.col('message_id')),
      ],
      group: ['user_id'],
      order: [['count', 'desc']],
      limit: 5,
      raw: true,
    });

    const userRanks = [];
    let userPlace = 1;

    for (const row of userStats) {
      if (ctx.guild.members.get(row.user_id)) {
        userRanks.push(`${userPlace}.: <@${row.user_id}>: ${row.count} messages`);
      } else {
        const user = await ctx.main.api.users.fetch(row.user_id);

        userRanks.push(`${userPlace}.: ${user.tag}: ${row.count} messages`);
      }

      userPlace += 1;
    }

    embed.addField('Top 5 members (server wide)', userRanks.join('\n'));

    ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const channelStats = await ctx.main.db.member_messages.findAll({
      where: {
        guild_id: ctx.guild.id,
        timestamp: {
          [Op.gte]: Date.now() - timespan * 1000,
        },
      },
      attributes: [
        'channel_id',
        ctx.main.db.sequelize.fn('count', ctx.main.db.sequelize.col('message_id')),
      ],
      group: ['channel_id'],
      order: [['count', 'desc']],
      limit: 5,
      raw: true,
    });

    const channelRanks = [];
    let channelPlace = 1;

    for (const row of channelStats) {
      channelRanks.push(`${channelPlace}.: <#${row.channel_id}>: ${row.count} messages`);

      channelPlace += 1;
    }

    embed.addField('Top 5 channels', channelRanks.join('\n'));

    ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const userChannelStats = await ctx.main.db.member_messages.findAll({
      where: {
        guild_id: ctx.guild.id,
        channel_id: (flags.channel) ? flags.channel.id : ctx.channel.id,
        timestamp: {
          [Op.gte]: Date.now() - timespan * 1000,
        },
      },
      attributes: [
        'user_id',
        ctx.main.db.sequelize.fn('count', ctx.main.db.sequelize.col('message_id')),
      ],
      group: ['user_id'],
      order: [['count', 'desc']],
      limit: 5,
      raw: true,
    });

    const userChannelRanks = [];
    let userChannelPlace = 1;

    for (const row of userChannelStats) {
      if (ctx.guild.members.get(row.user_id)) {
        userChannelRanks.push(`${userChannelPlace}.: <@${row.user_id}>: ${row.count} messages`);
      } else {
        const user = await ctx.main.api.users.fetch(row.user_id);

        userChannelRanks.push(`${userChannelPlace}.: ${user.tag}: ${row.count} messages`);
      }

      userChannelPlace += 1;
    }

    embed.addField(`Top 5 members (${(flags.channel) ? `for channel #${flags.channel.name}` : 'this channel'})`, userChannelRanks.join('\n'));

    embed.addField('\u200B', `[View more detailed statistics](https://bot.wrmsr.io/stats/guild/${ctx.guild.id}/)`);

    return ctx.reply({
      embed,
    });
  },
};

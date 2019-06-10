// require('pg').defaults.parseInt8 = true; // https://github.com/sequelize/sequelize/issues/4550
const winston = require('winston');

module.exports = (router, main) => {
  router.get('/', async (req, res, next) => {
    const resolution = Math.floor(req.query.days * 24 * 60 / 200);

    const Op = main.db.Sequelize.Op;

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    let totalMessages = main.db.member_messages.count({
      where: {
        guild_id: req.params.guildID,
        timestamp: {
          [Op.gte]: Date.now() - req.query.days * 24 * 60 * 60 * 1000,
        },
      },
    });

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    let memberJoinLeaveCount = main.db.member_events.findAll({
      where: {
        guild_id: req.params.guildID,
        timestamp: {
          [Op.gte]: Date.now() - req.query.days * 24 * 60 * 60 * 1000,
        },
      },
      attributes: [
        'type',
        main.db.sequelize.fn('count', main.db.sequelize.col('type')),
      ],
      group: ['type'],
      limit: 100,
      raw: true,
    });

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    let messageGraph = main.db.member_messages.findAll({
      where: {
        guild_id: req.params.guildID,
        timestamp: {
          [Op.gte]: Date.now() - req.query.days * 24 * 60 * 60 * 1000,
          [Op.lte]: Date.now(), // time_bucket_gapfill needs this to make the last two args optional
        },
      },
      attributes: [
        [main.db.sequelize.fn('time_bucket_gapfill', `${resolution} minutes`, main.db.sequelize.col('timestamp')), 'name'],
        [main.db.sequelize.fn('coalesce', main.db.sequelize.fn('count', main.db.sequelize.col('message_id')), 0), 'y'],
      ],
      group: ['name'],
      order: [[main.db.sequelize.literal('name'), 'asc']],
      raw: true,
    });

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    let channelMessageBars = main.db.member_messages.findAll({
      where: {
        guild_id: req.params.guildID,
        timestamp: {
          [Op.gte]: Date.now() - req.query.days * 24 * 60 * 60 * 1000,
        },
      },
      attributes: [
        ['channel_id', 'name'],
        [main.db.sequelize.fn('count', main.db.sequelize.col('message_id')), 'y'],
      ],
      group: ['channel_id'],
      order: [[main.db.sequelize.literal('y'), 'desc']],
      raw: true,
    });

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    let memberCountGraph = main.db.guild_member_counts.findAll({
      where: {
        guild_id: req.params.guildID,
        timestamp: {
          [Op.gte]: Date.now() - req.query.days * 24 * 60 * 60 * 1000,
          [Op.lte]: (main.lastGuildMemberStatsRunTimestamp) ? main.lastGuildMemberStatsRunTimestamp : Date.now(), // avoid displaying zero online and total members if the last run is some time in the past already
        },
      },
      attributes: [
        [main.db.sequelize.fn('time_bucket_gapfill', `${resolution} minutes`, main.db.sequelize.col('timestamp')), 'name'],
        [main.db.sequelize.fn('coalesce', main.db.sequelize.fn('avg', main.db.sequelize.col('members_online')), 0), 'members_online'],
        [main.db.sequelize.fn('coalesce', main.db.sequelize.fn('avg', main.db.sequelize.col('members_total')), 0), 'members_total'],
      ],
      group: ['name'],
      order: [[main.db.sequelize.literal('name'), 'asc']],
      raw: true,
    });

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    let memberDeltaGraph = main.db.member_events.findAll({
      where: {
        guild_id: req.params.guildID,
        timestamp: {
          [Op.gte]: Date.now() - req.query.days * 24 * 60 * 60 * 1000,
          [Op.lte]: Date.now(), // time_bucket_gapfill needs this to make the last two args optional
        },
      },
      attributes: [
        [main.db.sequelize.fn('time_bucket_gapfill', `${resolution} minutes`, main.db.sequelize.col('timestamp')), 'name'],
        [main.db.sequelize.literal('coalesce(count(1) filter (where type = \'JOIN\'), 0) - coalesce(count(1) filter (where type = \'LEAVE\'), 0)'), 'y'],
      ],
      group: ['name'],
      order: [[main.db.sequelize.literal('name'), 'asc']],
      raw: true,
    });

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    let userStatsTable = main.db.member_messages.findAll({
      where: {
        guild_id: req.params.guildID,
        timestamp: {
          [Op.gte]: Date.now() - req.query.days * 24 * 60 * 60 * 1000,
        },
      },
      attributes: [
        'user_id',
        [main.db.sequelize.fn('max', main.db.sequelize.col('timestamp')), 'last_message'],
        [main.db.sequelize.fn('sum', main.db.sequelize.col('char_count')), 'char_count'],
        [main.db.sequelize.fn('sum', main.db.sequelize.col('word_count')), 'word_count'],
        [main.db.sequelize.fn('sum', main.db.sequelize.col('user_mention_count')), 'user_mention_count'],
        [main.db.sequelize.fn('sum', main.db.sequelize.col('attachment_count')), 'attachment_count'],
        main.db.sequelize.fn('count', main.db.sequelize.col('message_id')),
      ],
      group: ['user_id'],
      order: [['count', 'desc']],
      limit: 100,
      raw: true,
    });

    [
      totalMessages,
      memberJoinLeaveCount,
      messageGraph,
      channelMessageBars,
      memberDeltaGraph,
      memberCountGraph,
      userStatsTable,
    ] = await Promise.all([
      totalMessages,
      memberJoinLeaveCount,
      messageGraph,
      channelMessageBars,
      memberDeltaGraph,
      memberCountGraph,
      userStatsTable,
    ]);

    for (const row of userStatsTable) {
      const user = await main.api.users.fetch(row.user_id);

      row.avatarURL = user.displayAvatarURL();
      row.tag = user.tag;
      row.id = user.id;

      row.last_message_formatted = main.stringUtils.formatUnixTimestamp(row.last_message, 2, false);
    }

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

    const guild = main.api.guilds.get(req.params.guildID);

    for (const row of channelMessageBars) {
      if (guild.channels.get(row.name)) {
        row.name = guild.channels.get(row.name).name;
      } else {
        winston.warn('No channel found for ID: %s', row.name); // TODO: we might insert this channel ID in a SQL table and let the bot periodically scan this table to automatically remove stale records
        row.name = '<deleted channel>';
      }
    }

    return res.render('stats/guild/guild', {
      cards: {
        guild: {
          name: guild.name,
          iconURL: guild.iconURL(),
          region: guild.region,
        },
        owner: {
          name: (guild.owner) ? guild.owner.user.username : 'N/A (deleted user)',
          id: (guild.owner) ? guild.owner.user.id : false,
          avatarURL: (guild.owner) ? guild.owner.user.displayAvatarURL() : 'https://cdn.discordapp.com/embed/avatars/0.png',
        },
        onlineMembers: guild.members.filter(c => c.presence && c.presence.status !== 'offline').size,
        totalMembers: guild.memberCount,
        membersJoined,
        membersLeft,
        totalMessages,
      },
      diagrams: {
        messageGraph: JSON.stringify(messageGraph),
        channelMessageBars: JSON.stringify(channelMessageBars),
        memberDeltaGraph: JSON.stringify(memberDeltaGraph),
        memberCountGraph: JSON.stringify(memberCountGraph),
      },
      userStatsTable,
      pages: [
        {
          text: 'Stats',
          link: '../..',
        },
        {
          text: main.api.guilds.get(req.params.guildID).name,
          icon: main.api.guilds.get(req.params.guildID).iconURL(),
        },
      ],
    });
  });

  return router;
};

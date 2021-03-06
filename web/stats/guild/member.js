const winston = require('winston');

module.exports = (router, main) => {
  router.get('/member/:memberID(\\d+)', async (req, res, next) => {
    if (!main.api.guilds.get(req.params.guildID).members.get(req.params.memberID)) {
      res.status(404);
      return res.render('404');
    }

    const resolution = Math.floor(req.query.days * 24 * 60 / 200);

    const Op = main.db.Sequelize.Op;

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const totalMessages = await main.db.member_messages.count({
      where: {
        guild_id: req.params.guildID,
        user_id: req.params.memberID,
        timestamp: {
          [Op.gte]: Date.now() - req.query.days * 24 * 60 * 60 * 1000,
        },
      },
    });

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const messageGraph = await main.db.member_messages.findAll({
      where: {
        guild_id: req.params.guildID,
        user_id: req.params.memberID,
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
    const channelMessageBars = await main.db.member_messages.findAll({
      where: {
        guild_id: req.params.guildID,
        user_id: req.params.memberID,
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
    const userStatsTable = await main.db.member_messages.findAll({
      where: {
        guild_id: req.params.guildID,
        user_id: req.params.memberID,
        timestamp: {
          [Op.gte]: Date.now() - req.query.days * 24 * 60 * 60 * 1000,
        },
      },
      attributes: [
        'channel_id',
        [main.db.sequelize.fn('max', main.db.sequelize.col('timestamp')), 'last_message'],
        [main.db.sequelize.fn('sum', main.db.sequelize.col('char_count')), 'char_count'],
        [main.db.sequelize.fn('sum', main.db.sequelize.col('word_count')), 'word_count'],
        [main.db.sequelize.fn('sum', main.db.sequelize.col('user_mention_count')), 'user_mention_count'],
        [main.db.sequelize.fn('sum', main.db.sequelize.col('attachment_count')), 'attachment_count'],
        main.db.sequelize.fn('count', main.db.sequelize.col('message_id')),
      ],
      group: ['channel_id'],
      order: [['count', 'desc']],
      limit: 100,
      raw: true,
    });

    const guild = main.api.guilds.get(req.params.guildID);

    for (const row of channelMessageBars) {
      if (guild.channels.get(row.name)) {
        row.name = guild.channels.get(row.name).name;
      } else {
        winston.warn('No channel found for ID: %s', row.name);
        row.name = '<deleted channel>';
      }
    }

    for (const row of userStatsTable) {
      if (guild.channels.get(row.channel_id)) {
        row.name = guild.channels.get(row.channel_id).name;
      } else {
        winston.warn('No channel found for ID: %s', row.channel_id);
        row.name = '<deleted channel>';
      }

      row.last_message_formatted = main.stringUtils.formatUnixTimestamp(row.last_message, 2, false);
    }

    return res.render('stats/guild/member', {
      cards: {
        totalMessages,
        joinedTimestamp: main.stringUtils.formatUnixTimestamp(main.api.guilds.get(req.params.guildID).members.get(req.params.memberID).joinedTimestamp, 2, false),
        highestRole: main.api.guilds.get(req.params.guildID).members.get(req.params.memberID).roles.highest.name,
      },
      diagrams: {
        messageGraph: JSON.stringify(messageGraph),
        channelMessageBars: JSON.stringify(channelMessageBars),
      },
      userStatsTable,
      pages: [
        {
          text: 'Stats',
          link: '../../..',
        },
        {
          text: main.api.guilds.get(req.params.guildID).name,
          icon: main.api.guilds.get(req.params.guildID).iconURL(),
          link: '..',
        },
        {
          text: main.api.users.get(req.params.memberID).username,
          icon: main.api.users.get(req.params.memberID).avatarURL(),
        },
      ],
    });
  });

  return router;
};

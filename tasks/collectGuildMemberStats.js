const winston = require('winston');
const prettyMs = require('pretty-ms');

module.exports = {
  interval: 60 * 5,
  fn: async (main) => { // TODO: wait a few minutes after bot start / restart to have some more guild members cached for better accuracy?
    const startTime = Date.now();

    for (const guild of main.api.guilds.values()) {
      winston.debug('Collecting stats for guild: %s...', guild.name);

      main.prometheusMetrics.sqlCommands.labels('INSERT').inc(); // TODO: I propably should move the metrics after actually calling the IO functions, to see any errors impacting the stats
      try {
        await main.db.guild_member_counts.create({
          guild_id: guild.id,
          timestamp: Date.now(),
          members_online: guild.members.filter(c => c.presence.status !== 'offline').size,
          members_total: guild.memberCount,
        });
      } catch (ex) {
        winston.error('There was an error writing guild stats for guild %s: %s', guild.id, ex.message);
      }
    }

    winston.debug('Collecting guild stats finished after %s', prettyMs(Date.now() - startTime));

    main.prometheusMetrics.statsCollectionDuration.set(Date.now() - startTime);

    main.lastGuildMemberStatsRunTimestamp = Date.now();
  },
};

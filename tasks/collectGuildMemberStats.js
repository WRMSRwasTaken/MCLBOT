const winston = require('winston');
const prettyMs = require('pretty-ms');
const Bluebird = require('bluebird');

const interval = 60 * 10; // 10 Minutes interval

module.exports = {
  interval,
  fn: async (main) => {
    const startTime = Date.now();

    // dynamically adjust the sleep duration based on the current guild count and consider 2500 guilds the maximum which would result in 216 ms sleep time and 9 min job execution time (in theory)
    const sleepDuration = 54 / main.api.guilds.size * 10000; // eslint-disable-line no-mixed-operators

    for (const guild of main.api.guilds.values()) {
      if (!main.ready || main.isShuttingDown) {
        return;
      }

      winston.debug('Collecting stats for guild: %s...', guild.name);

      main.prometheusMetrics.sqlCommands.labels('INSERT').inc(); // TODO: I propably should move the metrics after actually calling the IO functions, to see any errors impacting the stats
      await main.db.guild_member_counts.create({
        guild_id: guild.id,
        timestamp: Date.now(),
        members_online: guild.members.filter((c) => c.presence.status !== 'offline').size,
        members_total: guild.memberCount,
      });

      await Bluebird.delay(sleepDuration);
    }

    winston.debug('Collecting guild stats finished after %s', prettyMs(Date.now() - startTime));

    main.prometheusMetrics.statsCollectionDuration.set(Date.now() - startTime);

    main.lastGuildMemberStatsRunTimestamp = Date.now();
  },
};

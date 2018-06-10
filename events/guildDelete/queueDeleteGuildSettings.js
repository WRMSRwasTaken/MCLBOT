/*

See tasks/deleteGuildSettings.js for the idea behind this file

 */

module.exports = {
  fn: (main, guild) => {
    main.prometheusMetrics.sqlWrites.inc();

    main.db.delete_guild_settings_queue.upsert({
      guild_id: guild.id,
    });
  },
};

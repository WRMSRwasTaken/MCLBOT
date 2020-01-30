/*

See tasks/deleteGuildSettings.js for the idea behind this file

 */

module.exports = {
  fn: (main, GuildDelete) => {
    if (GuildDelete.isUnavailable) {
      return;
    }

    main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
    main.db.delete_guild_settings_queue.upsert({
      guild_id: GuildDelete.guild.id,
    });
  },
};

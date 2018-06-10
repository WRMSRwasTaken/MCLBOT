/*

See tasks/deleteGuildSettings.js for the idea behind this file

 */

module.exports = {
  fn: (main, guild) => {
    main.prometheusMetrics.sqlWrites.inc();

    main.db.delete_guild_settings_queue.destroy({
      where: {
        guild_id: guild.id,
      },
    });
  },
};

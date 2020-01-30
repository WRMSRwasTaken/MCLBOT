/*

See tasks/deleteGuildSettings.js for the idea behind this file

 */

module.exports = {
  fn: (main, GuildCreate) => {
    if (GuildCreate.fromUnavailable) {
      return;
    }

    main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
    main.db.delete_guild_settings_queue.destroy({
      where: {
        guild_id: GuildCreate.guild.id,
      },
    });
  },
};

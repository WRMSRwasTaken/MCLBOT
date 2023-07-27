module.exports = {
  disabled: true,
  interval: 60,
  fn: async (main) => {
    const Op = main.db.Sequelize.Op;

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const expiringMutes = await main.db.muted_members.findAll({
      where: {
        expires_at: {
          [Op.lt]: Date.now() + 60 * 1000,
        },
        queue_id: null,
      },
    });

    for (const expiringMute of expiringMutes) {
      let delay = (expiringMute.expires_at - Date.now()) / 1000;

      if (delay < 0) {
        delay = 0;
      }

      const job = await main.jobHelper.enqueue('unmute', {}, delay);

      main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
      await main.db.muted_members.update({
        queue_id: job.id,
      }, {
        where: {
          guild_id: expiringMute.guild_id,
          target_id: expiringMute.target_id,
        },
      });
    }
  },
};

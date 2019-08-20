const uuid = require('uuid');

module.exports = { // TODO: if we're in sharded mode, run this job only on shard 0
  interval: 60,
  load: async (main) => {
    if (!main.remindTasks) {
      main.remindTasks = {};
    }
  },
  fn: async (main) => {
    const Op = main.db.Sequelize.Op;

    main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const reminders = await main.db.reminders.findAll({
      where: {
        notify_date: {
          [Op.lt]: Date.now() + 60 * 1000,
        },
        queue_id: null,
      },
    });

    for (const reminder of reminders) {
      let delay = (reminder.notify_date - Date.now()) / 1000;

      if (delay < 0) {
        delay = 0;
      }

      const job = await main.jobHelper.enqueue('remind', {}, delay);

      main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
      await main.db.reminders.update({
        queue_id: job.id,
      }, {
        where: {
          user_id: reminder.user_id,
          fake_id: reminder.fake_id,
        },
      });
    }
  },
};

const prettyMs = require('pretty-ms');
const moment = require('moment');

module.exports = {
  description: 'Reminds you of something after a certain amount of time',
  alias: ['timer', 'reminder'],
  fn: 'add',
  subcommands: {
    add: {
      description: 'Add / create a new reminder',
      alias: ['create', 'set'],
      arguments: [
        {
          label: 'duration',
          type: 'duration',
          max: 365 * 24 * 60 * 60 * 2,
        },
        {
          label: 'text',
          type: 'string',
          infinite: true,
        },
      ],
      fn: async (ctx, duration, text) => {
        const timestamp = Date.now() + duration * 1000;

        ctx.main.prometheusMetrics.sqlReads.inc(1);

        const reminderCount = await ctx.main.db.reminders.count({
          where: {
            user_id: ctx.author.id,
          },
        });

        if (reminderCount >= 100) {
          return 'Maximum limit of 100 reminders reached. Please delete reminders with `remind delete` before adding new ones.';
        }

        ctx.main.prometheusMetrics.sqlReads.inc(1);

        let newFakeID = await ctx.main.db.reminders.max('fake_id', {
          where: {
            user_id: ctx.author.id,
          },
        });

        if (!newFakeID) {
          newFakeID = 1;
        } else {
          newFakeID += 1;
        }

        let job;

        if (duration <= 60) {
          job = await ctx.main.jobHelper.enqueue('remind', {}, duration);
        }

        ctx.main.prometheusMetrics.sqlWrites.inc(1);

        await ctx.main.db.reminders.create({
          user_id: ctx.author.id,
          fake_id: newFakeID,
          notify_date: timestamp,
          text,
          queue_id: (job) ? job.id : null,
        });

        return `Reminder set for ${prettyMs(duration * 1000, { verbose: true })} from now (at ${moment().add(duration, 'seconds').format()})`;
      },
    },
    list: {
      description: 'Shows all reminders for the current user',
      alias: 'l',
      fn: async (ctx) => {
        ctx.main.prometheusMetrics.sqlReads.inc(1);

        const reminderCount = await ctx.main.db.reminders.count({
          where: {
            user_id: ctx.author.id,
          },
        });

        if (reminderCount === 0) {
          return 'You don\'t have any reminders set.';
        }

        const resultsPerPage = 10;

        const paginatedEmbed = await ctx.main.paginationHelper.createPaginatedEmbedList(ctx);

        paginatedEmbed.on('paginate', async (pageNumber) => {
          ctx.main.prometheusMetrics.sqlReads.inc(2);

          const results = await ctx.main.db.reminders.findAndCountAll({
            where: {
              user_id: ctx.author.id,
            },
            limit: resultsPerPage,
            order: [['fake_id', 'ASC']],
            offset: (pageNumber - 1) * resultsPerPage,
          });

          let list = '';

          for (const row of results.rows) {
            if (list !== '') {
              list += '\n';
            }

            list += `__${row.fake_id}.__ ${ctx.main.stringUtils.formatUnixTimestamp(row.notify_date.getTime(), 2)}\n**${row.text}**`;
          }

          let pageCount = Math.floor(results.count / resultsPerPage);

          if (results.count % resultsPerPage !== 0) {
            pageCount += 1;
          }

          paginatedEmbed.emit('updateContent', {
            pageContent: list,
            pageCount,
            entryCount: results.count,
            title: 'Reminders',
          });
        });

        paginatedEmbed.emit('paginate', 1);

        return true;
      },
    },
    delete: {
      description: 'Deletes a user\'s reminder',
      alias: ['remove'],
      arguments: [
        {
          label: 'reminder id | all',
          type: 'integer',
          list: true,
        },
      ],
      fn: async (ctx, reminderID) => {
        const result = await ctx.main.db.reminders.findOne({
          where: {
            user_id: ctx.author.id,
            fake_id: reminderID,
          },
        });

        if (!result) {
          return ctx.main.stringUtils.argumentError(ctx, 0, 'No reminder found with that ID');
        }

        if (result.queue_id) {
          const job = await ctx.main.jobQueue.getJob(result.queue_id);

          await job.remove();
        }

        await ctx.main.db.reminders.destroy({
          where: {
            user_id: ctx.author.id,
            fake_id: reminderID,
          },
        });

        return `Reminder with ID ${reminderID} has been deleted.`;
      },
    },
  },
};

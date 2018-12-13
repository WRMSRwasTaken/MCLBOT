const prettyMs = require('pretty-ms');
const moment = require('moment');

module.exports = {
  description: 'Reminds you of something after a certain amount of time',
  alias: ['timer', 'reminder'],
  fn: 'add',
  subcommands: {
    add: {
      description: 'Add / create a new reminder',
      alias: ['create'],
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

        let pageCount = Math.floor(reminderCount / resultsPerPage);

        if (reminderCount % resultsPerPage !== 0) {
          pageCount += 1;
        }

        const paginatedEmbed = await ctx.main.paginationHelper.createPaginatedEmbedList(ctx, 'Reminders', pageCount);

        if (!paginatedEmbed) {
          return false;
        }

        paginatedEmbed.on('paginate', async (pageNumber) => {
          ctx.main.prometheusMetrics.sqlReads.inc(2);

          const paginatedResults = await ctx.main.db.reminders.findAndCountAll({
            where: {
              user_id: ctx.author.id,
            },
            limit: resultsPerPage,
            order: [['fake_id', 'ASC']],
            offset: (pageNumber - 1) * resultsPerPage,
          });

          let paginatedList = '';

          for (const row of paginatedResults.rows) {
            if (paginatedList !== '') {
              paginatedList += '\n';
            }

            paginatedList += `__${row.fake_id}.__ at ${ctx.main.stringUtils.formatUnixTimestamp(row.notify_date.getTime())}\n**${row.text}**`;
          }

          let newPageCount = Math.floor(reminderCount / resultsPerPage);

          if (reminderCount % resultsPerPage !== 0) {
            newPageCount += 1;
          }

          paginatedEmbed.emit('update', paginatedList, newPageCount, paginatedResults.count);
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

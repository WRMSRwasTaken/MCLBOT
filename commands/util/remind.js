const prettyMs = require('pretty-ms');
const moment = require('moment');
const uuid = require('uuid');

module.exports = {
  description: 'Reminds you of something after a certain amount of time',
  alias: ['timer', 'reminder'],
  fn: 'add',
  load: async (main) => {
    if (!main.remindTasks) {
      main.remindTasks = {};
    }
  },
  subcommands: {
    add: {
      description: 'Add / create a new reminder',
      alias: ['a', 'create', 'set', 'c'],
      arguments: [
        {
          label: 'duration',
          type: 'duration',
          min: 1,
          max: 365 * 24 * 60 * 60 * 2,
        },
        {
          optional: true,
          label: 'text',
          type: 'string',
          infinite: true,
          max: 1000,
        },
      ],
      fn: async (ctx, duration, text) => {
        const timestamp = Date.now() + duration * 1000;

        ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
        const reminderCount = await ctx.main.db.reminders.count({
          where: {
            user_id: ctx.author.id,
          },
        });

        if (reminderCount >= 100) {
          return 'Maximum limit of 100 reminders reached. Please delete reminders with `remind delete` before adding new ones.';
        }

        let job;

        if (duration <= 60) {
          job = await ctx.main.jobHelper.enqueue('remind', {}, duration);
        }

        ctx.main.prometheusMetrics.sqlCommands.labels('INSERT').inc();
        await ctx.main.db.reminders.create({
          user_id: ctx.author.id,
          fake_id: ctx.main.db.sequelize.literal(`(select coalesce(max(fake_id), 0) + 1 from reminders where user_id = '${ctx.author.id}')`),
          notify_date: timestamp,
          text,
          message_id: (text) ? null : ctx.message.id,
          channel_id: (text) ? null : ctx.channel.id,
          guild_id: (!text && ctx.guild) ? ctx.guild.id : null,
          queue_id: (job) ? job.id : null,
        });

        return `Reminder set for ${prettyMs(duration * 1000, { verbose: true })} from now (at ${moment().add(duration, 'seconds').format()})`;
      },
    },
    list: {
      description: 'Shows all reminders or a specific one for the given ID',
      alias: ['l', 'show', 's', 'print', 'p', 'view', 'v'],
      arguments: [
        {
          optional: true,
          label: 'ID',
          type: 'integer',
          min: 1,
          max: 100,
        },
      ],
      fn: async (ctx, reminderID) => {
        if (reminderID) {
          ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
          const result = await ctx.main.db.reminders.findOne({
            where: {
              user_id: ctx.author.id,
              fake_id: reminderID,
            },
          });

          if (!result) {
            return ctx.main.stringUtils.argumentError(ctx, 0, 'No reminder found with that ID');
          }

          const text = (result.text) ? result.text : `<https://discordapp.com/channels/${(result.guild_id) ? result.guild_id : '@me'}/${result.channel_id}/${result.message_id}>`;

          return `Reminder information for ID: \`${reminderID}\` created at \`${ctx.main.stringUtils.formatUnixTimestamp(result.createdAt)}\` which is going to expire on \`${ctx.main.stringUtils.formatUnixTimestamp(result.notify_date)}\`:\n\n${text}`;
        }

        ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
        const reminderCount = await ctx.main.db.reminders.count({
          where: {
            user_id: ctx.author.id,
          },
        });

        if (reminderCount === 0) {
          return 'You don\'t have any reminders set.';
        }

        const resultsPerPage = 10;

        const perEntryOverhead = 70;

        const paginatedEmbed = await ctx.main.paginationHelper.createPaginatedEmbedList(ctx);

        paginatedEmbed.on('paginate', async (pageNumber) => {
          ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
          const results = await ctx.main.db.reminders.findAndCountAll({
            where: {
              user_id: ctx.author.id,
            },
            limit: resultsPerPage,
            order: [['fake_id', 'ASC']],
            offset: (pageNumber - 1) * resultsPerPage,
          });

          let list = '';
          let listTextLength = 0;

          for (const row of results.rows) {
            if (list !== '') {
              list += '\n';
            }

            listTextLength += (row.text) ? row.text.length : 13;

            list += `__${row.fake_id}.__ ${ctx.main.stringUtils.formatUnixTimestamp(row.notify_date, 2)}\n${(row.text) ? `**${row.text}**` : '<no text set>'}`;
          }

          if (perEntryOverhead * results.rows.length + listTextLength > 1024) {
            const maxTextLength = Math.floor((1024 - perEntryOverhead * results.rows.length) / results.rows.length);

            list = '';

            for (const row of results.rows) {
              if (list !== '') {
                list += '\n';
              }

              list += `__${row.fake_id}.__ ${ctx.main.stringUtils.formatUnixTimestamp(row.notify_date, 2)}\n${(row.text) ? `**${row.text.substring(0, maxTextLength)}**${(row.text.length > maxTextLength) ? '[...]' : ''}` : '<no text set>'}`;
            }
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
      description: 'Deletes reminder(s)',
      alias: ['d', 'remove', 'r'],
      arguments: [
        {
          label: 'reminder id(s) | all',
          type: 'integer',
          infinite: true,
          list: true,
          listAll: true,
          min: 1,
          max: 100,
        },
      ],
      fn: async (ctx, input) => {
        ctx.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
        const reminderCount = await ctx.main.db.reminders.count({
          where: {
            user_id: ctx.author.id,
          },
        });

        if (reminderCount === 0) {
          return 'You don\'t have any reminders set.';
        }

        if (input === 'all') {
          ctx.main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
          await ctx.main.db.reminders.destroy({
            where: {
              user_id: ctx.author.id,
            },
          });

          return 'All your reminders have been deleted.';
        }

        // https://github.com/sequelize/sequelize/issues/4122

        ctx.main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
        const result = await ctx.main.db.sequelize.query(`DELETE FROM "reminders" WHERE user_id = '${ctx.author.id}' AND (fake_id = '${input.join('\' OR fake_id = \'')}') RETURNING fake_id;`);

        if (result[0].length === 0) {
          if (input.length === 1) {
            return ctx.main.stringUtils.argumentError(ctx, 0, 'No reminder found with that ID');
          }

          return ctx.main.stringUtils.argumentError(ctx, 0, 'None of the given reminder IDs does exist');
        }

        let removedReminders = 'Removed reminder';

        for (const fakeID of result[0]) {
          removedReminders = `${removedReminders} #${fakeID.fake_id}`;
        }

        return removedReminders;
      },
    },
  },
};

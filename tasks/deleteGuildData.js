const winston = require('winston');
const nconf = require('nconf');

/*

When the Discord API is having problems, the "guildDelete" event is fired for some guilds the bot is member of, and after a short amount of time, the "guildCreate" event is fired for those guilds.
This sucks, because the bot hasn't been actually removed from the guild, but it'd have deleted all the settings for those guilds.
I don't know if this is a bug in discord.js or actually a problem with the Discord gateway.

To handle this, we are going to define a grace time window between the fired "guildDelete" event and the actual delete of the guild's data.
If the but has been re-added ("guildCreate" event fired) to that guild in the grace time window, the data won't be deleted.
This is also a nice bonus for people who remove the bot from their server and change their mind shortly afterwards.

 */

module.exports = {
  interval: 60 * 5,
  fn: async (main) => {
    const Op = main.db.Sequelize.Op;

    main.prometheusMetrics.sqlReads.inc();

    const guilds = await main.db.delete_guild_settings_queue.findAll({
      where: {
        created_at: {
          [Op.lt]: Date.now() - nconf.get('bot:deleteSettingsGraceTime') * 1000,
        },
      },
    });

    for (const guild of guilds) {
      winston.debug('Deleting settings for guild id %d', guild.guild_id);

      main.prometheusMetrics.sqlWrites.inc();

      main.db.blacklist.destroy({
        where: {
          [Op.or]: [
            {
              [Op.and]: {
                guild_id: guild.guild_id,
                user_id: {
                  [Op.ne]: 0,
                },
              },
            },
            {
              [Op.and]: {
                guild_id: guild.guild_id,
                channel_id: {
                  [Op.ne]: 0,
                },
              },
            },
          ],
        },
      });

      main.prometheusMetrics.sqlWrites.inc();

      main.db.guild_settings.destroy({
        where: {
          guild_id: guild.guild_id,
        },
      });

      main.prometheusMetrics.sqlWrites.inc();

      main.db.member_events.destroy({
        where: {
          guild_id: guild.guild_id,
        },
      });

      main.prometheusMetrics.sqlWrites.inc();

      main.db.member_messages.destroy({
        where: {
          guild_id: guild.guild_id,
        },
      });

      main.prometheusMetrics.sqlWrites.inc();

      main.db.muted_members.destroy({
        where: {
          guild_id: guild.guild_id,
        },
      });

      main.prometheusMetrics.sqlWrites.inc();

      main.db.name_logs.destroy({
        where: {
          guild_id: guild.guild_id,
        },
      });

      main.prometheusMetrics.sqlWrites.inc();

      main.db.delete_guild_settings_queue.destroy({
        where: {
          guild_id: guild.guild_id,
        },
      });
    }
  },
};

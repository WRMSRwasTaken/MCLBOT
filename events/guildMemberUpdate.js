const winston = require('winston');

module.exports = {
  fn: async (main, oldMember, newMember) => {
    if (oldMember.nickname === newMember.nickname) {
      return;
    }

    if (oldMember.nickname && newMember.nickname) {
      winston.debug(`Nickname changed for user ${newMember.user.tag} on guild ${newMember.guild.name}: from ${oldMember.nickname} to ${newMember.nickname}`);

      main.prometheusMetrics.sqlWrites.inc(1);

      await main.db.name_logs.create({
        user_id: newMember.user.id,
        type: 'NICKNAME',
        guild_id: newMember.guild.id,
        before: oldMember.nickname,
        after: newMember.nickname,
      });
    } else if (newMember.nickname) {
      winston.debug(`A nickname has been added for user ${newMember.user.tag} on guild ${newMember.guild.name}: ${newMember.nickname}`);

      main.prometheusMetrics.sqlWrites.inc(1);

      await main.db.name_logs.create({
        user_id: newMember.user.id,
        type: 'NICKNAME',
        guild_id: newMember.guild.id,
        before: null,
        after: newMember.nickname,
      });
    } else if (oldMember.nickname) {
      winston.debug(`The nickname has been deleted for user ${newMember.user.tag} on guild ${newMember.guild.name}`);

      main.prometheusMetrics.sqlWrites.inc(1);

      await main.db.name_logs.create({
        user_id: newMember.user.id,
        type: 'NICKNAME',
        guild_id: newMember.guild.id,
        before: oldMember.nickname,
        after: null,
      });
    }
  },
};

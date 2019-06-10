const winston = require('winston');

module.exports = {
  fn: async (main, oldMember, newMember) => {
    if (oldMember.nickname === newMember.nickname) {
      return;
    }

    main.prometheusMetrics.sqlCommands.labels('INSERT').inc();

    if (oldMember.nickname && newMember.nickname) {
      winston.debug(`Nickname changed for user ${newMember.user.tag} on guild ${newMember.guild.name}: from ${oldMember.nickname} to ${newMember.nickname}`);

      await main.db.name_logs.create({
        user_id: newMember.user.id,
        type: 'NICKNAME',
        guild_id: newMember.guild.id,
        before: oldMember.nickname,
        after: newMember.nickname,
        timestamp: Date.now(),
      });
    } else if (newMember.nickname) {
      winston.debug(`A nickname has been added for user ${newMember.user.tag} on guild ${newMember.guild.name}: ${newMember.nickname}`);

      await main.db.name_logs.create({
        user_id: newMember.user.id,
        type: 'NICKNAME',
        guild_id: newMember.guild.id,
        before: null,
        after: newMember.nickname,
        timestamp: Date.now(),
      });
    } else if (oldMember.nickname) {
      winston.debug(`The nickname has been deleted for user ${newMember.user.tag} on guild ${newMember.guild.name}`);

      await main.db.name_logs.create({
        user_id: newMember.user.id,
        type: 'NICKNAME',
        guild_id: newMember.guild.id,
        before: oldMember.nickname,
        after: null,
        timestamp: Date.now(),
      });
    }
  },
};

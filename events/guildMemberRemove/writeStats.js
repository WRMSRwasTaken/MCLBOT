module.exports = {
  fn: (main, member) => {
    if (member.user.bot) {
      return;
    }

    main.prometheusMetrics.sqlCommands.labels('INSERT').inc();
    main.db.member_events.create({
      user_id: member.id,
      guild_id: member.guild.id,
      type: 'LEAVE',
      timestamp: Date.now(),
    });
  },
};

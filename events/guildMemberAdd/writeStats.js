module.exports = {
  fn: (main, GuildMemberAdd) => {
    if (GuildMemberAdd.isDuplicate) {
      return;
    }

    if (GuildMemberAdd.GuildMemberAdd.member.user.bot) {
      return;
    }

    main.prometheusMetrics.sqlCommands.labels('INSERT').inc();
    main.db.member_events.create({
      user_id: GuildMemberAdd.member.id,
      guild_id: GuildMemberAdd.member.guild.id,
      type: 'JOIN',
      timestamp: Date.now(),
    });
  },
};

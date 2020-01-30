module.exports = {
  fn: (main, GuildMemberRemove) => {
    if (GuildMemberRemove.isDuplicate) {
      return;
    }

    if (GuildMemberRemove.member.user.bot) {
      return;
    }

    main.prometheusMetrics.sqlCommands.labels('INSERT').inc();
    main.db.member_events.create({
      user_id: GuildMemberRemove.member.id,
      guild_id: GuildMemberRemove.member.guild.id,
      type: 'LEAVE',
      timestamp: Date.now(),
    });
  },
};

module.exports = {
  fn: (main, member) => {
    if (member.user.bot) {
      return;
    }

    main.prometheusMetrics.influxWrites.inc();
    main.influx.writePoints([
      {
        measurement: 'member_leave',
        tags: {
          guild_id: member.guild.id,
        },
        fields: {
          user_id: member.id,
        },
      },
    ]);
  },
};

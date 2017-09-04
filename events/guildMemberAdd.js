module.exports = {
  fn: (main, member) => {
    if (member.user.bot) {
      return;
    }

    main.influx.writePoints([
      {
        measurement: 'member_join',
        tags: {
          server_id: member.guild.id,
        },
        fields: {
          user_id: member.user.id,
        },
      },
    ]);
  },
};

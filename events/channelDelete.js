module.exports = {
  fn: (main, channel) => {
    if (!channel.guild) {
      return;
    }

    main.prometheusMetrics.sqlWrites.inc();

    main.db.member_messages.destroy({
      where: {
        guild_id: channel.guild.id,
        channel_id: channel.id,
      },
    });
  },
};

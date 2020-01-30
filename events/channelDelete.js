module.exports = {
  fn: (main, ChannelDelete) => {
    main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
    main.db.member_messages.destroy({
      where: {
        guild_id: ChannelDelete.channel.guildId,
        channel_id: ChannelDelete.channel.id,
      },
    });
  },
};

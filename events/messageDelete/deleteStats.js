module.exports = {
  fn: (main, MessageDelete) => {
    if (MessageDelete.message.author.bot || MessageDelete.message.pinned || MessageDelete.message.system || !MessageDelete.message.guild) {
      return;
    }

    main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
    main.db.member_messages.destroy({
      where: {
        message_id: MessageDelete.message.id,
      },
    });
  },
};

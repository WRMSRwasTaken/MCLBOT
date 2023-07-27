module.exports = {
  fn: (main, message) => {
    if (message.author.bot || message.pinned || message.system || !message.guild) {
      return;
    }

    main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
    main.db.member_messages.destroy({
      where: {
        message_id: message.id,
      },
    });
  },
};

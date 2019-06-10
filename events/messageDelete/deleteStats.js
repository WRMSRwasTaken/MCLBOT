module.exports = {
  fn: (main, message) => {
    if (message.guild) {
      main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
      main.db.member_messages.destroy({
        where: {
          message_id: message.id,
        },
      });
    }
  },
};

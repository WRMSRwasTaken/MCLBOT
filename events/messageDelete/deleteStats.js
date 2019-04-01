module.exports = {
  fn: (main, message) => {
    if (message.guild) {
      main.db.member_messages.destroy({
        where: {
          message_id: message.id,
        },
      });

      main.prometheusMetrics.sqlWrites.inc();
    }
  },
};

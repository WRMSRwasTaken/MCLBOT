module.exports = {
  fn: (main, message) => {
    if (message.guild && !message.author.bot) {
      main.prometheusMetrics.influxWrites.inc();

      main.influx.query(`delete from member_message where message_id = ${main.Influx.escape.stringLit(message.id)}`);
    }

    main.commandHandler.handleMessageDeleteEvent(message);
  },
};

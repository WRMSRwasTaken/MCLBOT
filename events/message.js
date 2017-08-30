module.exports = {
  fn: (main, message) => {
    if (message.channel.type !== 'dm' && !message.author.bot) {
      main.prometheusMetrics.sqlWrites.inc();

      main.db.member_last_message.upsert({
        server_id: message.guild.id,
        user_id: message.author.id,
      });

      main.prometheusMetrics.sqlWrites.inc();

      main.db.member_message.upsert({
        server_id: message.guild.id,
        user_id: message.author.id,
        message_id: message.id,
      });
    }

    main.commandHandler.handleMessageEvent(message);

    // REPL CODE HERE
  },
};

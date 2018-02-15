module.exports = {
  description: 'starts an interactive REPL session',
  alias: 'run',
  fn: (message, param, main) => {
    if (!main.replSessions) {
      main.replSessions = [];
    }

    const replObject = {
      user: message.author.id,
      channel: (main.commandHandler.isDM(message)) ? 0 : message.channel.id,
    };

    console.log(main.replSessions.includes(replObject));

    if (main.replSessions.indexOf(replObject) > 0) {
      message.send('Already a REPL session running.');
    } else {
      main.replSessions.push(replObject);
      message.send('REPL session started.');
    }
  },
};

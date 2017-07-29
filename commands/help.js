const commands = {};

commands.help = {
  name: 'help',
  hide: true,
  alias: ['h', 'commands'],
  optArgs: ['command'],
  desc: 'displays help',
  fn: (message, params, main) => {
    const tryParsedNumber = parseInt(params, 10);

    if (!params) {
      const output = main.utils.displayHelpPage();

      if (!main.commandHandler.isDM(message)) {
        message.author.send(output);
        return `<@${message.author.id}> I've sent you a PM`;
      }

      return output;
    } else if (!isNaN(tryParsedNumber)) {
      const output = main.utils.displayHelpPage(tryParsedNumber);

      if (!main.commandHandler.isDM(message)) {
        message.author.send(output);
        return `<@${message.author.id}> I've sent you a PM`;
      }

      return output;
    } else if (main.commands[params] || main.aliases[params]) {
      if (!main.commands[params]) {
        return `Help for command \`${main.aliases[params]}\`: ${main.utils.displayCommandHelp(main.aliases[params])}`;
      }
      return `Help for command \`${params}\`: ${main.utils.displayCommandHelp(params)}`;
    }
    return 'Help for unknown command requested.';
  },
};

module.exports = commands;

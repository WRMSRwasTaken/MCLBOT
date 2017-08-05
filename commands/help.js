const commands = {};

commands.help = {
  name: 'help',
  // hide: true,
  alias: ['h', 'commands'],
  optArgs: ['command or help page'],
  desc: 'displays help',
  fn: async (message, params, main) => {
    const tryParsedNumber = parseInt(params, 10);

    if (params && !main.commands[params] && !main.aliases[params] && isNaN(tryParsedNumber)) {
      return 'Help for unknown command requested.';
    }

    if (main.commands[params] || main.aliases[params]) {
      if (!main.commands[params]) {
        return `Help for command \`${main.aliases[params]}\`: ${main.utils.displayCommandHelp(main.aliases[params])}`;
      }
      return `Help for command \`${params}\`: ${main.utils.displayCommandHelp(params)}`;
    }

    // if (!main.commandHandler.isDM(message)) {
    //   message.send(`<@${message.author.id}> I've sent you a PM`);
    // }

    const helpOutput = (!isNaN(tryParsedNumber)) ? main.utils.displayHelpPage(tryParsedNumber) : main.utils.displayHelpPage();

    const helpMsg = await message.send(helpOutput);

    const paginationHelper = await main.paginationHelper.initPagination(helpMsg, message.author);

    if (!paginationHelper) {
      return false;
    }

    paginationHelper.on('test', () => {
      console.log('pagination event fired via event emitter!');
    });
  },
};

module.exports = commands;

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

    let currentPage = (!isNaN(tryParsedNumber)) ? tryParsedNumber : 1;

    const helpMsg = await message.send(main.utils.displayHelpPage(currentPage));

    const paginationHelper = await main.paginationHelper.initPagination(helpMsg, message.author, main.helpPages.length);

    if (!paginationHelper) {
      return false;
    }

    paginationHelper.on('paginate', (pageNumber) => {
      helpMsg.edit(main.utils.displayHelpPage(pageNumber));
    });
  },
};

module.exports = commands;

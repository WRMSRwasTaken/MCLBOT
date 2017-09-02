module.exports = {
  alias: ['h', 'commands'],
  optArgs: ['command or help page'],
  desc: 'Displays the bot\'s help pages',
  fn: async (context, params) => {
    params = params.join(' ');

    const tryParsedNumber = parseInt(params, 10);

    if (params && !context.main.commands[params] && !context.main.aliases[params] && isNaN(tryParsedNumber)) {
      return 'Help for unknown command requested.';
    }

    if (context.main.commands[params] || context.main.aliases[params]) {
      if (!context.main.commands[params]) {
        return `Help for command \`${context.main.aliases[params]}\`: ${context.main.stringUtils.displayCommandHelp(context.main.aliases[params])}`;
      }
      return `Help for command \`${params}\`: ${context.main.stringUtils.displayCommandHelp(params)}`;
    }

    // if (!main.commandHandler.isDM(message)) {
    //   message.send(`<@${message.author.id}> I've sent you a PM`);
    // }

    const currentPage = (!isNaN(tryParsedNumber)) ? tryParsedNumber : 1;

    const helpMsg = await context.reply(context.main.stringUtils.displayHelpPage(currentPage));

    const paginationHelper = await context.main.paginationHelper.initPagination(helpMsg, context.author, context.main.helpPages.length);

    if (!paginationHelper) {
      return false;
    }

    paginationHelper.on('paginate', (pageNumber) => {
      helpMsg.edit(context.main.stringUtils.displayHelpPage(pageNumber));
    });
  },
};

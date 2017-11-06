module.exports = {
  alias: ['h', 'commands'],
  desc: 'Displays the bot\'s help pages',
  arguments: [
    {
      label: 'command',
      type: 'string',
      optional: true,
    },
    {
      label: 'subcommand',
      type: 'string',
      optional: true,
    },
  ],
  fn: async (ctx, command) => {
    if (command) {
      if (!ctx.main.commands[command] && !ctx.main.aliases[command]) {
        return 'Help for unknown command requested.';
      }

      if (!ctx.main.commands[command]) {
        return `Help for command \`${ctx.main.aliases[command]}\`: ${ctx.main.stringUtils.displayCommandHelp(ctx.main.aliases[command])}`;
      }
      return `Help for command \`${command}\`: ${ctx.main.stringUtils.displayCommandHelp(command)}`;
    }
    //
    // if (ctx.main.commands[params] || ctx.main.aliases[params]) {
    //   if (!ctx.main.commands[params]) {
    //     return `Help for command \`${ctx.main.aliases[params]}\`: ${ctx.main.stringUtils.displayCommandHelp(ctx.main.aliases[params])}`;
    //   }
    //   return `Help for command \`${params}\`: ${ctx.main.stringUtils.displayCommandHelp(params)}`;
    // }

    // if (!main.commandHandler.isDM(message)) {
    //   message.send(`<@${message.author.id}> I've sent you a PM`);
    // }
    //
    // const currentPage = (!isNaN(tryParsedNumber)) ? tryParsedNumber : 1;

    const helpMsg = await ctx.reply(ctx.main.stringUtils.displayHelpPage());

    const paginationHelper = await ctx.main.paginationHelper.initPagination(helpMsg, ctx.author, ctx.main.helpPages.length);

    if (!paginationHelper) {
      return false;
    }

    paginationHelper.on('paginate', (pageNumber) => {
      helpMsg.edit(ctx.main.stringUtils.displayHelpPage(pageNumber));
    });
  },
};

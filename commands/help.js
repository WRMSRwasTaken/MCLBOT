module.exports = {
  alias: ['h', 'commands'],
  description: 'Displays the bot\'s help pages',
  arguments: [
    {
      label: 'command',
      type: 'string',
      optional: true,
    },
    {
      label: 'subCommand',
      type: 'string',
      optional: true,
    },
  ],
  fn: async (ctx, command, subCommand) => {
    if (!ctx.isBotAdmin) {
      return 'The help command is currently disabled.';
    }

    if (!command) {
      const helpMsg = await ctx.reply(ctx.main.stringUtils.displayHelpPage());

      const paginationHelper = ctx.main.paginationHelper.initPagination(helpMsg, ctx.author, ctx.main.helpPages.length);

      if (!paginationHelper) {
        return false;
      }

      paginationHelper.on('paginate', (pageNumber) => {
        helpMsg.edit(ctx.main.stringUtils.displayHelpPage(pageNumber));
      });

      return true;
    }

    const helpCommand = this.main.commands[command] || this.main.commands[this.main.aliases[command]];

    if (!helpCommand) {
      return 'Help for unknown command requested.';
    }

    if (!helpCommand.subcommands && subCommand) {
      return `Command \`${helpCommand.name}\` has no subcommands.`;
    }

    const helpSubCommand = helpCommand.subcommands[subCommand] || helpCommand.subcommands[helpCommand.subcommandAliases[subCommand]];

    // if()

    if (!ctx.main.commands[command]) {
      return `Help for command \`${ctx.main.aliases[command]}\`: ${ctx.main.stringUtils.displayCommandHelp(ctx.main.aliases[command])}`;
    }
    return `Help for command \`${command}\`: ${ctx.main.stringUtils.displayCommandHelp(command)}`;

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
  },
};

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
      label: 'subcommand',
      type: 'string',
      optional: true,
    },
  ],
  fn: async (ctx, command, subcommand) => {
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

    const helpCommand = ctx.main.commands[command] || ctx.main.commands[ctx.main.aliases[command]];

    if (!helpCommand) {
      return 'Help for unknown command requested.';
    }

    if (!helpCommand.subcommands && subcommand) {
      return `Command \`${helpCommand.name}\` has no subcommands.`;
    }

    if (subcommand) {
      const helpSubCommand = helpCommand.subcommands[subcommand] || helpCommand.subcommands[helpCommand.subcommandAliases[subcommand]];

      if (!helpSubCommand) {
        return 'Help for unknown subcommand requested.';
      }
    }

    let output = '```';

    if (helpCommand.description) {
      output += `Description: ${helpCommand.description}\n`;
    }

    if (helpCommand.alias) {
      output += `Alias${(Array.isArray(helpCommand.alias)) ? '(es)' : ''}: ${(Array.isArray(helpCommand.alias)) ? helpCommand.alias.join(', ') : helpCommand.alias}\n`;
    }

    if (helpCommand.arguments) {
      output += 'Usage: ';
      for (const argument of helpCommand.arguments) {
        output += `${(argument.optional) ? '[' : '<'}${argument.label}${(argument.optional) ? ']' : '>'} `;
      }
      output += '\n';
    } else if (!helpCommand.fn) {
      output += 'Base command is not executable. (Using a subcommand is mandatory)\n';
    }

    if (helpCommand.subcommands) {
      output += `Subcommands: ${Object.keys(helpCommand.subcommands).join(', ')}`;

      output += '\n';
    }

    output += '```';
    return output;

    // if (!ctx.main.commands[command]) {
    //   return `Help for command \`${ctx.main.aliases[command]}\`: ${ctx.main.stringUtils.displayCommandHelp(ctx.main.aliases[command])}`;
    // }
    // return `Help for command \`${command}\`: ${ctx.main.stringUtils.displayCommandHelp(command)}`;

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

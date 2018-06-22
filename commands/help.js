const nconf = require('nconf');

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

    let helpSubCommand;

    if (subcommand) {
      helpSubCommand = helpCommand.subcommands[subcommand] || helpCommand.subcommands[helpCommand.subcommandAliases[subcommand]];

      if (!helpSubCommand) {
        return 'Help for unknown subcommand requested.';
      }
    }

    const redirect = typeof helpCommand.fn === 'string' && !subcommand;

    if (redirect) {
      helpSubCommand = helpCommand.subcommands[helpCommand.fn];
    }

    const propertyCommand = helpSubCommand || helpCommand;

    let output = '```';

    if (redirect && helpCommand.description) {
      output += `Description: ${helpCommand.description}\n`;
    } else if (!redirect && propertyCommand.description) {
      output += `Description: ${propertyCommand.description}\n`;
    }

    if (redirect && helpCommand.alias) {
      output += `Alias${(Array.isArray(helpCommand.alias)) ? '(es)' : ''}: ${(Array.isArray(helpCommand.alias)) ? helpCommand.alias.join(', ') : helpCommand.alias}\n`;
    } else if (!redirect && propertyCommand.alias) {
      output += `Alias${(Array.isArray(propertyCommand.alias)) ? '(es)' : ''}: ${(Array.isArray(propertyCommand.alias)) ? propertyCommand.alias.join(', ') : propertyCommand.alias}\n`;
    }

    if (helpCommand.fn) {
      let cooldown = ctx.main.commandHandler.getProperty(ctx, 'cooldown', helpCommand, helpSubCommand);

      if (cooldown === undefined) {
        cooldown = nconf.get('bot:defaultCooldown');
      }

      if (cooldown !== 0) {
        output += `Cooldown: ${cooldown} seconds\n`;
      }
    }

    if (!helpCommand.fn) {
      output += 'Base command is not executable. (Using a subcommand is mandatory)\n';
    } else if (propertyCommand.arguments) {
      output += 'Usage: ';

      output += helpCommand.name;

      output += ' ';

      if (subcommand) {
        output += helpSubCommand.name;

        output += ' ';
      }

      for (const argument of propertyCommand.arguments) {
        output += `${(argument.optional) ? '[' : '<'}${argument.label}${(argument.optional) ? ']' : '>'} `;
      }

      output += ' (<> means mandatory parameter, [] means optional parameter)';

      output += '\n';
    } else {
      output += 'Command takes no arguments.\n';
    }

    if (helpCommand.subcommands && !subcommand) {
      output += `Subcommands: ${Object.keys(helpCommand.subcommands).join(', ')} (To see help for a subcommand, type help <command> <subcommand>)`;

      output += '\n';
    }

    if (helpCommand.flags) {
      output += 'Flags:';

      let spaces = true;

      for (const flag of Object.keys(helpCommand.flags)) {
        output += ` ${(spaces) ? '' : '      '}--${flag}${(helpCommand.flags[flag].type) ? ` <${helpCommand.flags[flag].type}>` : ''}${(helpCommand.flags[flag].short) ? ` / -${helpCommand.flags[flag].short}` : ''}${(helpCommand.flags[flag].type) ? ` <${helpCommand.flags[flag].type}>` : ''}\n`;

        spaces = false;
      }
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

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
    if (!ctx.isBotAdmin && !command) {
      return 'The help overview command is currently disabled for now. However, it is enabled for displaying help if specific commands with: help <command>';
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

    const commandObject = ctx.main.commands[command] || ctx.main.commands[ctx.main.aliases[command]];

    if (!commandObject) {
      return 'Help for unknown command requested.';
    }

    if (!commandObject.subcommands && subcommand) {
      return `Command \`${commandObject.name}\` has no subcommands.`;
    }

    let subcommandObject;

    if (subcommand) {
      subcommandObject = commandObject.subcommands[subcommand] || commandObject.subcommands[commandObject.subcommandAliases[subcommand]];

      if (!subcommandObject) {
        return 'Help for unknown subcommand requested.';
      }
    }

    const redirect = typeof commandObject.fn === 'string' && !subcommand;

    if (redirect) {
      subcommandObject = commandObject.subcommands[commandObject.fn];
    }

    const commandObjectToHandle = subcommandObject || commandObject;

    const embed = new ctx.main.Discord.MessageEmbed();

    let hasArguments = false;

    embed.setTitle(`Help for command: ${commandObject.name} ${(subcommand) ? subcommandObject.name : ''}`);

    if (redirect && commandObject.description) {
      embed.addField('Description', commandObject.description, false);
    } else if (!redirect && commandObjectToHandle.description) {
      embed.addField('Description', commandObjectToHandle.description, false);
    }

    if (redirect && commandObject.alias) {
      embed.addField(`Alias${(Array.isArray(commandObject.alias)) ? '(es)' : ''}`, (Array.isArray(commandObject.alias)) ? commandObject.alias.join(', ') : commandObject.alias, false);
    } else if (!redirect && commandObjectToHandle.alias) {
      embed.addField(`Alias${(Array.isArray(commandObjectToHandle.alias)) ? '(es)' : ''}`, (Array.isArray(commandObjectToHandle.alias)) ? commandObjectToHandle.alias.join(', ') : commandObjectToHandle.alias, false);
    }

    if (commandObjectToHandle.fn) {
      let cooldown = ctx.main.commandHandler.getProperty(ctx, 'cooldown', commandObject, subcommandObject);

      if (cooldown === undefined) {
        cooldown = {
          actions: nconf.get('bot:defaultCooldownActions'),
          period: nconf.get('bot:defaultCooldownPeriod'),
        };
      }

      if (cooldown !== false) {
        embed.addField('Cooldown', `Max. ${cooldown.actions} actions in ${cooldown.period} seconds`, false);
      }
    }

    if (!commandObjectToHandle.fn && !subcommand) {
      embed.addField('Base command is not executable', 'Using a subcommand is mandatory', false);
    } else if (commandObjectToHandle.arguments) {
      let usageText = commandObject.name;
      usageText += ' ';

      if (subcommand) {
        usageText += subcommandObject.name;
        usageText += ' ';
      }

      for (const argument of commandObjectToHandle.arguments) {
        usageText += `${(argument.optional) ? '[' : '<'}${argument.label || argument.type}${(argument.optional) ? ']' : '>'} `;
      }

      embed.addField('Usage', usageText, false);

      hasArguments = true;
    }

    let flagText = '';

    if (subcommand && commandObject.flags) {
      for (const flagName of Object.keys(commandObject.flags)) {
        const flag = commandObject.flags[flagName];

        if (!flag.global) {
          continue; // eslint-disable-line no-continue
        }

        flagText += `--${flag.name}${(flag.type) ? ` <${flag.label || flag.type}>` : ''}${(flag.short) ? ` / -${flag.short}` : ''}${(flag.type) ? ` <${flag.label || flag.type}>` : ''}\n`;
      }
    }

    if (commandObjectToHandle.flags && commandObjectToHandle.fn) {
      for (const flagName of Object.keys(commandObjectToHandle.flags)) {
        const flag = commandObjectToHandle.flags[flagName];

        flagText += `--${flag.name}${(flag.type) ? ` <${flag.label || flag.type}>` : ''}${(flag.short) ? ` / -${flag.short}` : ''}${(flag.type) ? ` <${flag.label || flag.type}>` : ''}\n`;
      }
    }

    if (flagText) {
      embed.addField('Flags', flagText, false);

      hasArguments = true;
    }

    if (commandObjectToHandle.subcommands && !subcommand) {
      let subcommandText = '';

      for (const subcommandName of Object.keys(commandObjectToHandle.subcommands)) {
        const tempSubcommand = commandObjectToHandle.subcommands[subcommandName];

        subcommandText += `${tempSubcommand.name} - ${tempSubcommand.description}\n`;
      }

      subcommandText += '\n';

      embed.addField('Subcommands', subcommandText, false);
    }

    if (hasArguments) {
      embed.setFooter('Argument legend: <> means mandatory parameter, [] means optional parameter');
    }

    ctx.reply({
      embed,
    });
  },
};

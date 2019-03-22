const nconf = require('nconf');

module.exports = {
  alias: ['h', 'commands'],
  description: 'Displays the bot\'s help pages, or information about a command (if provided)',
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
    if (!command) {
      const resultsPerPage = 10;

      let pageCount = 1; // one page for the overview of categories

      const pageMaps = {};

      let categoryOverviewText = '';

      if (ctx.main.uncategorizedCommands.length > 0) { // the 1st page for uncategorized commands
        let uncategorizedSize = 0;

        for (const iterCommand of ctx.main.uncategorizedCommands) {
          if (!ctx.main.commandHandler.getProperty(ctx, 'hide', ctx.main.commands[iterCommand])) {
            uncategorizedSize += 1;
          }
        }

        if (uncategorizedSize > 0) {
          pageCount += 1;

          let pagesForThisCategory = Math.floor(uncategorizedSize / resultsPerPage) - 1;

          if (uncategorizedSize % resultsPerPage !== 0) {
            pagesForThisCategory += 1;
          }

          categoryOverviewText += `\n• **uncategorized**: Page ${pageCount}${(pagesForThisCategory > 0) ? ` - ${pageCount + pagesForThisCategory}` : ''}`;

          for (let i = pageCount; i <= pageCount + pagesForThisCategory; i += 1) {
            pageMaps[i] = {
              category: 'uncategorized',
              first: pageCount,
              last: pageCount + pagesForThisCategory,
            };
          }

          pageCount += pagesForThisCategory;
        }
      }

      for (const category of Object.keys(ctx.main.categories)) {
        let categorySize = 0;

        for (const iterCommand of ctx.main.categories[category]) {
          if (!ctx.main.commandHandler.getProperty(ctx, 'hide', ctx.main.commands[iterCommand])) {
            categorySize += 1;
          }
        }

        if (categorySize === 0) {
          continue; // eslint-disable-line no-continue
        }

        pageCount += 1;

        let pagesForThisCategory = Math.floor(categorySize / resultsPerPage) - 1;

        if (categorySize % resultsPerPage !== 0) {
          pagesForThisCategory += 1;
        }

        categoryOverviewText += `\n• **${category}**: Page ${pageCount}${(pagesForThisCategory > 0) ? ` - ${pageCount + pagesForThisCategory}` : ''}`;

        for (let i = pageCount; i <= pageCount + pagesForThisCategory; i += 1) {
          pageMaps[i] = {
            category,
            first: pageCount,
            last: pageCount + pagesForThisCategory,
          };
        }

        pageCount += pagesForThisCategory;
      }

      const paginatedEmbed = await ctx.main.paginationHelper.createPaginatedEmbedList(ctx);

      if (!paginatedEmbed) {
        return false;
      }

      paginatedEmbed.on('paginate', async (pageNumber) => {
        let pageContent;

        if (pageNumber === 1) {
          pageContent = `Category overview:\n${categoryOverviewText}`;
        } else {
          pageContent = `Commands in category \`${pageMaps[pageNumber].category}\`${(pageMaps[pageNumber].last > pageMaps[pageNumber].first) ? ` (${pageNumber - pageMaps[pageNumber].first + 1} / ${pageMaps[pageNumber].last - pageMaps[pageNumber].first + 1})` : ''}:\n\n`;

          const offset = resultsPerPage * (pageNumber - pageMaps[pageNumber].first);

          const category = pageMaps[pageNumber].category;
          const categoryCommands = (category === 'uncategorized') ? ctx.main.uncategorizedCommands : ctx.main.categories[category];

          let resultCount;

          if (categoryCommands.length > offset + resultsPerPage) {
            resultCount = offset + resultsPerPage - 1;
          } else {
            resultCount = categoryCommands.length - 1;
          }

          for (let i = offset; i <= resultCount; i += 1) {
            const iteratedCommand = categoryCommands[i];

            pageContent += `• **${iteratedCommand}**: ${ctx.main.commands[iteratedCommand].description}\n`;
          }

          pageContent += '\nFor help with a specific command type `help <command>`';
        }

        paginatedEmbed.emit('updateContent', {
          pageContent,
          pageCount,
          title: 'MCLBOT help',
        });
      });

      paginatedEmbed.emit('paginate', 1);

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

    let showFooter = false;

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

      showFooter = true;
    }

    let flagText = '';

    if (subcommand && commandObject.flags) {
      for (const flagName of Object.keys(commandObject.flags)) {
        const flag = commandObject.flags[flagName];

        if (!flag.global) {
          continue; // eslint-disable-line no-continue
        }

        flagText += `• \`--${flag.name}${(flag.type) ? ` <${flag.label || flag.type}>` : ''}\`${(flag.short) ? ` / \`-${flag.short} ${(flag.type) ? ` <${flag.label || flag.type}>` : ''}\`` : ''}${(flag.description) ? `\n    ${flag.description}` : ''}\n`; // eslint-disable-line no-irregular-whitespace
      }
    }

    if (commandObjectToHandle.flags && commandObjectToHandle.fn) {
      for (const flagName of Object.keys(commandObjectToHandle.flags)) {
        const flag = commandObjectToHandle.flags[flagName];

        flagText += `• \`--${flag.name}${(flag.type) ? ` <${flag.label || flag.type}>` : ''}\`${(flag.short) ? ` / \`-${flag.short} ${(flag.type) ? ` <${flag.label || flag.type}>` : ''}\`` : ''}${(flag.description) ? `\n    ${flag.description}` : ''}\n`; // eslint-disable-line no-irregular-whitespace
      }
    }

    if (flagText) {
      embed.addField('Flags', flagText, false);

      showFooter = true;
    }

    if ((commandObjectToHandle.subcommands && !subcommand) || (redirect && commandObject.subcommands && !subcommand)) {
      let cmdObj = commandObjectToHandle;

      if (redirect) {
        cmdObj = commandObject;
      }

      let subcommandText = '';

      for (const subcommandName of Object.keys(cmdObj.subcommands)) {
        const tempSubcommand = cmdObj.subcommands[subcommandName];

        subcommandText += `• ${tempSubcommand.name}${(tempSubcommand.description) ? `\n    ${tempSubcommand.description}` : ''}\n`; // eslint-disable-line no-irregular-whitespace
      }

      subcommandText += '\n';

      embed.addField(`Subcommands (for subcommand help use \`help ${commandObject.name} <subcommand>\`)`, subcommandText, false);
    }

    if (showFooter) {
      embed.setFooter('Argument legend: <> means mandatory parameter, [] means optional parameter');
    }

    return ctx.reply({
      embed,
    });
  },
};

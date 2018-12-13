module.exports = {
  hide: true,
  owner: true,
  description: 'Reload functionality for MCLBOT',
  fn: 'command',
  subcommands: {
    command: {
      description: 'reload a single bot command',
      alias: 'c',
      arguments: [
        {
          label: 'command',
          type: 'string',
        },
      ],
      fn: async (ctx, command) => {
        const reloadMsg = await ctx.reply(`Reloading command \`${command}\`...`);

        const start = Date.now();

        try {
          ctx.main.resourceLoader.loadCommand(command, null, true);
        } catch (err) {
          return reloadMsg.edit(err.message);
        }

        return reloadMsg.edit(`Command \`${command}\` reloaded in ${(Date.now() - start)}ms`);
      },
    },
    category: { // TODO: reload category seems to be broken because it just appends those in ctx.main.categories
      description: 'reload all bot commands in the given category',
      arguments: [
        {
          label: 'category',
          type: 'string',
        },
      ],
      fn: async (ctx, category) => {
        const reloadMsg = await ctx.reply(`Reloading all commands in the category \`${category}\`...`);

        const start = Date.now();

        try {
          ctx.main.resourceLoader.reloadCategory(category);
        } catch (err) {
          return reloadMsg.edit(err.message);
        }

        return reloadMsg.edit(`All commands in the category \`${category}\` reloaded in ${(Date.now() - start)}ms`);
      },
    },
    all: {
      description: 'reload all bot commands',
      fn: async (ctx) => {
        const reloadMsg = await ctx.reply('Reloading all bot commands...');

        const start = Date.now();

        try {
          ctx.main.resourceLoader.reloadAllCommands();
        } catch (err) {
          return reloadMsg.edit(`Error reloading bot commands:\n\n${err.message}`);
        }

        return reloadMsg.edit(`All bot commands reloaded in ${(Date.now() - start)}ms`);
      },
    },
  },
};

async function reloadCommand(ctx, command) {
  const reloadMsg = await ctx.reply(`Reloading command \`${command}\`...`);

  const start = Date.now();

  try {
    ctx.main.resourceLoader.loadCommand(command, null, true);
  } catch (ex) {
    return reloadMsg.edit(ex.message);
  }

  return reloadMsg.edit(`Command \`${command}\` reloaded in ${(Date.now() - start)}ms`);
}

module.exports = {
  owner: true,
  desc: 'reload a single bot command',
  arguments: [
    {
      label: 'command',
      type: 'string',
    },
  ],
  fn: async (ctx, command) => reloadCommand(ctx, command),
  subcommands: {
    command: {
      desc: 'reload a single bot command',
      arguments: [
        {
          label: 'command',
          type: 'string',
        },
      ],
      fn: async (ctx, command) => reloadCommand(ctx, command),
    },
    category: {
      desc: 'reload all bot commands in the given category',
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
        } catch (ex) {
          return reloadMsg.edit(ex.message);
        }

        return reloadMsg.edit(`All commands in the category \`${category}\` reloaded in ${(Date.now() - start)}ms`);
      },
    },
    all: {
      desc: 'reload all bot commands',
      fn: async (ctx) => {
        const reloadMsg = await ctx.reply('Reloading all bot commands...');

        const start = Date.now();

        try {
          ctx.main.resourceLoader.reloadAllCommands();
        } catch (ex) {
          return reloadMsg.edit(`Error reloading bot commands:\n\n${ex.message}`);
        }

        return reloadMsg.edit(`All bot commands reloaded in ${(Date.now() - start)}ms`);
      },
    },
  },
};

module.exports = {
  optArgs: ['show|set|reset', 'prefix'],
  desc: 'manages the bot\'s server command prefix',
  noDM: true,
  fn: async (message, params, main) => {
    const prefix = await main.prefixHelper.getServerPrefixFromDB(message.guild.id);

    let mode;
    let newPrefix;

    if (params[0]) {
      mode = params[0].toLowerCase();
    }

    if (params[1]) {
      newPrefix = params[1].toLowerCase();
    }

    if (['reset', 'set'].includes(mode) && !main.stringUtils.isGuildAdmin(message)) {
      return message.send('Sorry, but only server administrators are allowed to change the bot\'s server prefix');
    }

    if (!mode || mode === 'show') {
      if (prefix) {
        return `The bot's current custom prefix for this server is \`${prefix.prefix}\``;
      }

      return `The bot's default prefix is \`${main.prefixHelper.getDefaultPrefix()}\` (No custom prefix has been set for this server)`;
    } else if (mode === 'reset') {
      if (!prefix) {
        return `There's currently no custom prefix set for this server. (The bot's default prefix is\`${main.prefixHelper.getDefaultPrefix()}\`)`;
      }

      await main.prefixHelper.deleteServerPrefix(message.guild.id);
      return `The bot's prefix for this server has been reset to it's default \`${main.prefixHelper.getDefaultPrefix()}\``;
    } else if (mode === 'set') {
      if (!newPrefix) {
        return main.stringUtils.argumentsError('prefix', 1, 'No custom prefix specified');
      }

      await main.prefixHelper.setServerPrefix(message.guild.id, newPrefix);
      return `The bot's custom prefix has been set to \`${newPrefix}\` for this server`;
    }

    return main.stringUtils.argumentsError('prefix', 0, 'Unknown command argument');
  },
};


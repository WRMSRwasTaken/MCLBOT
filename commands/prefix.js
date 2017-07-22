const commands = {};

commands.prefix = {
  name: 'prefix',
  optArgs: ['show|set|reset', 'prefix'],
  desc: 'manages the bot\'s command prefix on this server',
  fn: async (message, params, main) => {
    const prefix = await main.prefixHelper.getServerPrefixFromDB(message.guild.id);

    if ((params[0] === 'reset' || params[0] === 'set') && !message.member.hasPermission('MANAGE_GUILD')) {
      return message.send('Sorry, but only server administrators are allowed to change the bot\'s server prefix');
    }

    if (!params[0] || params[0] === 'show') {
      if (prefix) {
        return `The bot's current custom prefix for this server is \`${prefix.prefix}\``;
      }

      return `The bot's default prefix is \`${main.prefixHelper.getDefaultPrefix()}\` (No custom prefix has been set for this server)`;
    } else if (params[0] === 'reset') {
      if (!prefix) {
        return `There's currently no custom prefix set for this server. (The bot's default prefix is\`${main.prefixHelper.getDefaultPrefix()}\`)`;
      }

      await main.prefixHelper.deleteServerPrefix(message.guild.id);
      return `The bot's prefix for this server has been reset to it's default \`${main.prefixHelper.getDefaultPrefix()}\``;
    } else if (params[0] === 'set') {
      if (!params[1]) {
        return main.utils.argumentsError('prefix', 1, 'No custom prefix specified');
      }

      await main.prefixHelper.setServerPrefix(message.guild.id, params[1]);
      return `The bot's custom prefix has been set to \`${params[1]}\` for this server`;
    }

    return main.utils.argumentsError('prefix', 0, 'Unknown command argument.');
  },
};

module.exports = commands;

const commands = {};

commands.alias = {
  name: 'alias',
  hide: true,
  args: ['command'],
  desc: 'lists a command\'s aliases',
  fn: (message, params, main) => {
    if (params && main.commands[params]) {
      message.channel.send(`Aliases for command ${params}:\`\`\`${main.utils.listAliasesString(params)}\`\`\``);
    } else {
      message.channel.send('Aliases for unknown command requested.');
    }
  },
};

module.exports = commands;

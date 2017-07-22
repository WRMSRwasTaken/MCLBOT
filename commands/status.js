const commands = {};

commands.say = {
  name: 'status',
  desc: 'changes the bot\'s status',
  args: ['text'],
  owner: true,
  fn: (message, param, main) => {
    main.bot.user.setGame(param);
    message.send(`Status set to \`${param}\``);
  },
};

module.exports = commands;

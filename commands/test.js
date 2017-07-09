const commands = {};

commands.test = {
  name: 'test',
  desc: 'Just a test',
  hide: true,
  fn: () => 'Is it working?',
};

module.exports = commands;

module.exports = {
  desc: 'says something in the current channel',
  owner: true,
  args: ['text'],
  fn: (message, param) => {
    message.send(param);
  },
};

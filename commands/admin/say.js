module.exports = {
  desc: 'says something in the current channel',
  owner: true,
  arguments: [
    {
      label: 'message',
      type: 'string',
      infinite: true,
    },
  ],
  fn: (context, message) => context.reply(message),
};

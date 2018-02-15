module.exports = {
  description: 'says something in the current channel',
  arguments: [
    {
      label: 'message',
      type: 'string',
      infinite: true,
    },
  ],
  fn: (context, message) => context.reply(message),
};

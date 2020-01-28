module.exports = {
  description: 'Shutdown the bot',
  alias: ['exit', 'quit', 'die'],
  fn: async (ctx) => {
    const msg = await ctx.reply('Confirm bot shutdown:');

    const confirm = ctx.main.confirmationHelper.initConfirm(msg, ctx.author);

    confirm.on('timeout', () => {
      msg.edit('Bot shutdown cancelled, due to input timeout.');
    });

    confirm.on('false', () => {
      msg.edit('Bot shutdown cancelled.');
    });

    confirm.on('true', async () => {
      await msg.edit('Goodbye!');

      ctx.main.shutdown();
    });

    return true;
  },
};

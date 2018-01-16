module.exports = {
  desc: 'Leave the current server',
  guildOnly: true,
  permission: 'ADMINISTRATOR',
  fn: async (ctx) => {
    const msg = await ctx.reply('Do you really me to leave your server?');

    const confirm = ctx.main.confirmationHelper.initConfirm(msg, ctx.author);

    confirm.on('timeout', () => {
      msg.edit('Server leave cancelled, due to input timeout.');
    });

    confirm.on('false', () => {
      msg.edit('Server leave cancelled.');
    });

    confirm.on('true', async () => {
      msg.edit('Leaving the server, bye bye!');

      ctx.guild.leave();
    });
  },
};

module.exports = {
  description: 'Replies with the bot\'s ping time',
  fn: async (ctx) => {
    const start = Date.now();

    const pingMsg = await ctx.reply(':stopwatch: Pinging...');

    const time = Math.round((Date.now() - start) / 2);
    pingMsg.edit(`:ping_pong: Pong! \`${time}ms\``);
  },
};

module.exports = {
  desc: 'Replies with the bot\'s ping time',
  fn: async (message) => {
    const start = Date.now();

    const pingMsg = await message.send(':stopwatch: Pinging...');

    const time = Math.round((Date.now() - start) / 2);
    pingMsg.edit(`:ping_pong: Pong! \`${time}ms\``);
  },
};
const path = require('path');
const shared = require(path.resolve(__dirname, '../lib/shared.js'));
const main = shared.main;

main.registerCommand({
  name: 'pong',
  help: '<IP or hostname:port>',
  desc: 'pings a user',
  fn: (message) => {
    message.channel.send('pong');
  },
});

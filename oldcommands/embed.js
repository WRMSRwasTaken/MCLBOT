const path = require('path');
const shared = require(path.resolve(__dirname, '../lib/shared.js'));
const main = shared.main;

main.registerCommand({
  name: 'embed',
  fn: (message) => {
    message.channel.sendEmbed({
      description: 'description',
      color: '2',
      fields: [{name: 'testname', value: 'testvalue'}]
    });
  },
});

const path = require('path');
const shared = require(path.resolve(__dirname, '../lib/shared.js'));
const main = shared.main;

const child = require('child_process');
const fs = require('fs');

const opts = {
  stdio: [process.stdin, process.stdout, process.stderr, 'pipe', 'pipe'],
};

main.registerCommand({
  name: 'bait',
  description: 'idk',
  fn: (message, text, params) => {
    //message.channel.startTyping();

    message.channel.send('ok, processing')
      .then(msg => {
        const node = child.spawn('node', ['./worker.js'], opts);

        const childStream = [];

        node.stdio[3].write('lel');

        node.stdio[4].on('data', (chunk) => {
          childStream.push(chunk);
        });

        node.stdio[4].on('end', () => {
          console.log('fin rcvd data:', childStream);

          const buf = Buffer.concat(childStream);

          message.channel.sendFile(buf, 'lel.jpg')
            .then(() => msg.delete());

        });
      });

    //message.channel.stopTyping();
  },
});

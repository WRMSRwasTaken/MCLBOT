const path = require('path');
const shared = require(path.resolve(__dirname, '../lib/shared.js'));
const main = shared.main;

const child = require('child_process');
const fs = require('fs');
const request = require('superagent');

const opts = {
  stdio: ['pipe', 'pipe', 'pipe'],
  end: false,
};

const combinations = [
  ['40', '160'],
  ['50', '150'],
  ['60', '140'],
];

function random(arr) {
  return arr[random2(0, arr.length - 1)];
}

function random2(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

main.registerCommand({
  name: 'magik',
  desc: 'Do some ImageMagick',
  fn: (message, text, params) => {
    message.channel.send('ok, processing')
      .then((msg) => {

        let comb1 = random(combinations);
        let comb2 = random(combinations);

        let selectedDimensions = comb1[0] + '%x' + comb2[0] + '%';
        let selectedDimensions2 = comb1[1] + '%x' + comb2[1] + '%';

        const magik = child.spawn('convert', ['(', '(', 'fd:0', '-resize', '2000x2000>', ')', '-liquid-rescale', selectedDimensions, ')', '-resize', selectedDimensions2, 'fd:1'], opts);

        //const magik = child.spawn('convert', ['fd:0', '-resize', '64x64', 'fd:1'], opts);

        request
          .get(params)
          .pipe(magik.stdio[0]);

        //const buf = require('fs').readFileSync('./imgtmp/lel.jpg');

        const childStream = [];

        // magik.stdio[0].write(buf);
        // magik.stdio[0].end();

        magik.stdio[1].on('data', (chunk) => {
          childStream.push(chunk);
        });

        magik.stdio[1].on('end', () => {
          console.log('fin rcvd data:', childStream);

          const buf = Buffer.concat(childStream);

          console.log(buf.length);

          // fs.createWriteStream('tmp.png').write(buf);

          message.channel.sendFile(buf, 'lel.jpg')
            .then(() => msg.delete());
        });
      });
  },
});

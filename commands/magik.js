const path = require('path');

const child = require('child_process');
const fs = require('fs');
const axios = require('axios');

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

const commands = {};

commands.magik = {
  name: 'magik',
  hide: true,
  args: ['imagemagick'],
  desc: 'applies some magik to an image',
  fn: (message, params, main) => {
    message.send('ok, processing')
      .then((msg) => {
        const comb1 = random(combinations);
        const comb2 = random(combinations);

        const selectedDimensions = `${comb1[0]}%x${comb2[0]}%`;
        const selectedDimensions2 = `${comb1[1]}%x${comb2[1]}%`;

        const magik = child.spawn('convert', ['(', '(', 'fd:0', '-resize', '2000x2000>', ')', '-liquid-rescale', selectedDimensions, ')', '-resize', selectedDimensions2, 'fd:1'], opts);

        // const magik = child.spawn('convert', ['fd:0', '-resize', '64x64', 'fd:1'], opts);

        axios({
          method:'get',
          url:params,
          responseType:'stream'
        })
          .then(function(response) {
            response.data.pipe(magik.stdio[0])
          });

        // const buf = require('fs').readFileSync('./imgtmp/lel.jpg');

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

          message.send({
            files: [{
              attachment: buf,
              name: 'magik.png',
            }],
          })
            .then(() => msg.delete());
        });
      });
  },
};

module.exports = commands;

const path = require('path');

const child = require('child_process');
const fs = require('fs');
const axios = require('axios');
const gm = require('gm').subClass({ imageMagick: true });
const Bluebird = require('bluebird');

const opts = {
  stdio: [0, 1, 2, 'pipe', 'pipe'],
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
  args: ['image'],
  alias: ['imagemagic', 'imagemagick', 'magic', 'magick', 'cas', 'liquid'],
  desc: 'applies some magik to an image',
  fn: async (message, params, main) => {
    const waitmsg = await message.send('ok, processing');

    const comb1 = random(combinations);
    const comb2 = random(combinations);

    const selectedDimensions = `${comb1[0]}%x${comb2[0]}%`;
    const selectedDimensions2 = `${comb1[1]}%x${comb2[1]}%`;


    // const magik = child.spawn('convert', ['(', '(', 'fd:3', '-resize', '2000x2000>', ')', '-liquid-rescale', selectedDimensions, ')', '-resize', selectedDimensions2, 'fd:4'], opts);
    // const magik = child.spawn('convert', ['fd:3', '-resize', '2000x2000>', '-liquid-rescale', selectedDimensions, '-resize', selectedDimensions2, 'fd:4'], opts);


    // const magik = child.spawn('convert', ['fd:0', '-resize', '64x64', 'fd:1'], opts);

    let httpResponse;

    try {
      httpResponse = await axios({
        method: 'get',
        url: params,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36',
        },
      });
    } catch (err) {
      waitmsg.delete();
      delete message.replies[0];
      message.send('Downloading the image file failed!');
      return;
    }

    // const inputStream = new net.Socket({ fd: 3, readable: true, writable: true });

    // httpResponse.data.pipe(magik.stdio[3]);

    console.log(httpResponse.data.length);

    const gmImage = gm(httpResponse.data);

    let imageDimentsions;

    try {
      imageDimentsions = await new Bluebird((resolve, reject) => {
        gmImage.size((err, value) => {
          if (err) {
            reject(err);
          }
          resolve(value);
        });
      });
    } catch (err) {
      waitmsg.delete();
      delete message.replies[0];
      message.send('Could not identify image!');
      return;
    }

    if (imageDimentsions.width > 3000 || imageDimentsions.height > 3000) {
      waitmsg.delete();
      delete message.replies[0];
      message.send('Supplied image exceeds maximum resolution >= (3000, 3000)!');
      return;
    }

    let magikd;

    try {
      magikd = await new Bluebird((resolve, reject) => {
        gmImage
          .resize(800, 800, '<')
          // .out('-liquid-rescale', selectedDimensions)
          // .resize(comb1[1], comb2[1], '%')
          .out('-liquid-rescale', '50%,', '-liquid-rescale', '150%')
          .toBuffer(async (err, buffer) => {
            if (err) {
              reject(err);
            }
            resolve(buffer);
          });
      });
    } catch (err) {
      waitmsg.delete();
      delete message.replies[0];
      message.send('Error while applying magik to image!');
      return;
    }

    await message.send({
      files: [{
        attachment: magikd,
        name: 'magik.png',
      }],
    });

    waitmsg.delete();
    delete message.replies[0];

    // const buf = require('fs').readFileSync('./imgtmp/lel.jpg');

    // const childStream = [];

    // magik.stdio[0].write(buf);
    // magik.stdio[0].end();

    // magik.stdio[3].on('error', (err) => {
    //   console.log('fd3 error:', err);
    // });
    //
    // magik.stdio[4].on('data', (chunk) => {
    //   childStream.push(chunk);
    // });
    //
    // magik.stdio[4].on('end', async () => {
    //   console.log('fin rcvd data:', childStream);
    //
    //   const buf = Buffer.concat(childStream);
    //
    //   console.log(buf.length);
    //
    //   // fs.createWriteStream('tmp.png').write(buf);
    //
    //   const magikMessage = await message.send({
    //     files: [{
    //       attachment: buf,
    //       name: 'magik.png',
    //     }],
    //   });
    //
    //   waitmsg.delete();
    //   delete message.replies[0];
    // });
  },
};

module.exports = commands;

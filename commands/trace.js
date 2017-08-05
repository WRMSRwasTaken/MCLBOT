const path = require('path');

const child = require('child_process');
const fs = require('fs');
const axios = require('axios');
const gm = require('gm').subClass({ imageMagick: true });
const Bluebird = require('bluebird');

const commands = {};

commands.magik = {
  name: 'trace',
  args: ['image'],
  // alias: ['imagemagic', 'imagemagick', 'magic', 'magick', 'cas', 'liquid'],
  desc: 'edge tracing for image',
  fn: async (message, params, main) => {
    const waitmsg = await message.send('ok, processing');

    let httpResponse;

    try {
      httpResponse = await main.imageHelper.downloadImage(params);
    } catch (err) {
      waitmsg.delete();
      delete message.replies[0];
      message.send(err.message);
      return;
    }

    // try {
    //   httpResponse = await axios({
    //     method: 'get',
    //     url: params,
    //     responseType: 'arraybuffer',
    //     headers: {
    //       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36',
    //     },
    //   });
    // } catch (err) {
    //   waitmsg.delete();
    //   delete message.replies[0];
    //   message.send('Downloading the image file failed!');
    //   return;
    // }

    const gmImage = gm(httpResponse);

    let imageDimentsions;
    let format;

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

    try {
      format = await new Bluebird((resolve, reject) => {
        gmImage.format((err, value) => {
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

    if (format === 'GIF') {
      waitmsg.delete();
      delete message.replies[0];
      message.send('This command is for images, not gifs!');
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
          .out('-morphology', 'edgeout', 'diamond:1')
          .out('-evaluate', 'multiply', '3')
          .toBuffer(async (err, buffer) => {
            if (err) {
              reject(err);
            }
            resolve(buffer);
          });
        // gmImage
        //   // .resize(800, 800, '<')
        //   .out('-colorspace', 'Gray', '-channel', 'G')
        //   .out('-define', 'convolve:scale=\'50%!\'', '-bias', '50%')
        //   .out('(', '-clone', '0', '-morphology', 'Convolve', 'Sobel:0', ')')
        //   .out('(', '-clone', '0', '-morphology', 'Convolve', 'Sobel:90', ')')
        //   .out('-delete', '0', '-background', 'Black')
        //   .out('(', '-clone', '0,1', '-fx', '\'0.5', '+', 'atan2(v-0.5,0.5-u)/pi/2\'', ')')
        //   .out('(', '-clone', '0', '-fill', 'white', '-colorize', '100%', ')')
        //   .out('(', '-clone', '0,1', '-fx', '\'hypot(u-0.5,v-0.5)*2\'', ')')
        //   .out('-delete', '0,1', '-separate', '+channel')
        //   .out('-set', 'colorspace', 'HSB', '-combine', '-colorspace', 'RGB')
        //   .toBuffer(async (err, buffer) => {
        //     if (err) {
        //       reject(err);
        //     }
        //     resolve(buffer);
        //   });
      });
    } catch (err) {
      waitmsg.delete();
      delete message.replies[0];
      message.send('Error while applying convolution to image!');
      console.log(err);
      return;
    }

    await message.send({
      files: [{
        attachment: magikd,
        name: 'convolve.png',
      }],
    });

    waitmsg.delete();
    delete message.replies[0];
  },
};

module.exports = commands;

const axios = require('axios');
const gm = require('gm').subClass({ imageMagick: true });
const Bluebird = require('bluebird');

module.exports = {
  name: 'magik',
  args: ['image'],
  alias: ['imagemagic', 'imagemagick', 'magic', 'magick', 'cas', 'liquid'],
  desc: 'applies some magik to an image',
  fn: async (message, params, main) => {
    const waitmsg = await message.send('ok, processing');

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
          .out('-liquid-rescale', '50%', '-liquid-rescale', '150%')
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
  },
};


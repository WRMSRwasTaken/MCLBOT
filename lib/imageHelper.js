const winston = require('winston');
const axios = require('axios');
const Bluebird = require('bluebird');
const prettyBytes = require('pretty-bytes');
const gm = require('gm').subClass({ imageMagick: true });

class ImageHelper {
  constructor(main) {
    this.main = main;
  }

  async downloadImage(url) {
    const maxFileSize = 10 * 1000 * 1000; // 10 MB
    let httpResponse;
    let responseData = [];

    const cancelToken = axios.CancelToken;
    const source = cancelToken.source();

    winston.debug('Downloading image:', url);

    return new Bluebird(async (resolve, reject) => {
      try {
        httpResponse = await axios({
          cancelToken: source.token,
          method: 'get',
          url,
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36',
          },
        });
      } catch (err) {
        return reject(new Error('Downloading the image file failed!'));
      }

      httpResponse.data.on('error', (err) => {
        return reject(new Error('Downloading the image file failed!'));
      });

      if (httpResponse.headers['content-length'] && parseInt(httpResponse.headers['content-length'], 10) > maxFileSize) {
        source.cancel();
        responseData = [];
        return reject(new Error(`Image files mustn't be larger than ${prettyBytes(maxFileSize)}!`));
      }

      httpResponse.data.on('data', (chunk) => {
        responseData.push(chunk);

        if (Buffer.concat(responseData).length > maxFileSize) { // the 'content-length' header could be forged, so let's check twice
          source.cancel();
          responseData = [];
          return reject(new Error(`Image files mustn't be larger than ${prettyBytes(maxFileSize)}!`));
        }
      });

      httpResponse.data.on('end', () => {
        resolve(Buffer.concat(responseData));
      });
    });
  }

  async processImage(ctx, url, inParams, outParams) {
    const waitmsg = await ctx.reply('Downloading image...');

    let imageData;

    try {
      imageData = await ctx.main.imageHelper.downloadImage(url);
    } catch (ex) {
      // waitmsg.delete();
      // delete ctx.message.replies[0];
      return waitmsg.edit(ex.message);
    }

    winston.debug('Starting image identification...');

    await waitmsg.edit('Processing image...');

    const gmImage = gm(imageData);

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
      return waitmsg.edit('Could not identify image!');
    }

    winston.debug(`Image dimensions: ${imageDimentsions.width}x${imageDimentsions.height}`);

    if (imageDimentsions.width > 3000 || imageDimentsions.height > 3000) {
      return waitmsg.edit('Supplied image exceeds maximum resolution! (>= 3000, 3000)');
    }

    let imageFormat;

    try {
      imageFormat = await new Bluebird((resolve, reject) => {
        gmImage.format((err, value) => {
          if (err) {
            reject(err);
          }
          resolve(value);
        });
      });
    } catch (err) {
      return waitmsg.edit('Could not identify image!');
    }

    winston.debug(`Image format: ${imageFormat}`);

    if (imageFormat === 'GIF') {
      return waitmsg.edit('This command is for static images only!');
    }

    winston.debug('Starting image processing with arguments:', outParams);

    let gmOut;

    try {
      gmOut = await new Bluebird((resolve, reject) => {
        if (inParams) {
          gmImage.in(...inParams.split(' '));
        }

        if (outParams) {
          gmImage.out(...outParams.split(' '));
        }

        gmImage.toBuffer(async (err, buffer) => {
          if (err) {
            reject(err);
          }
          resolve(buffer);
        });
      });
    } catch (err) {
      // waitmsg.delete();
      // delete ctx.message.replies[0];
      winston.error('GM returned an error while processing the image', err);
      return waitmsg.edit('An error occurred while processing the image!');
    }

    winston.debug('Image processing finished, uploading image...');

    await waitmsg.edit('Uploading image...');

    await ctx.reply({
      files: [{
        attachment: gmOut,
        name: `image.${imageFormat}`,
      }],
    });

    delete ctx.message.replies[0];

    return waitmsg.delete();
  }
}

module.exports = ImageHelper;

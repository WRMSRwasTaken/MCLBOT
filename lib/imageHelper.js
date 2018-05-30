const winston = require('winston');
const axios = require('axios');
const raven = require('raven');
const nconf = require('nconf');
const Bluebird = require('bluebird');
const prettyBytes = require('pretty-bytes');
const Bottleneck = require('bottleneck');
const SocksProxyAgent = require('socks-proxy-agent');
const gm = require('gm').subClass({
  imageMagick: true,
});

class ImageHelper {
  constructor(main) {
    this.main = main;

    this.limiter = new Bottleneck({
      maxConcurrent: nconf.get('bot:maxConcurrentImageJobs'),
    });

    this.limiter.on('idle', () => {
      winston.debug('Image job queue is now empty');
    });

    this.userAgentString = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';

    this.maxRedirects = 5;

    this.agent = new SocksProxyAgent('socks://127.0.0.1:9050');
  }

  async checkImageUrl(url) {
    let httpResponse;

    winston.debug('Going to check, if "%s" is a valid image url', url);

    try {
      httpResponse = await axios({
        method: 'head',
        url,
        headers: {
          'User-Agent': this.userAgentString,
        },
        maxRedirects: this.maxRedirects,
        // httpAgent: this.agent,
        // httpsAgent: this.agent,
      });
    } catch (err) {
      winston.debug('Server for url "%s" answered with HTTP status code %d', url, err.response.status);

      return false;
    }

    winston.debug('Server for url "%s" answered with HTTP status code %d', url, httpResponse.status);

    return httpResponse.status === 200;
  }

  async downloadImage(url) {
    const maxFileSize = nconf.get('bot:maxDownloadFileSize') * 1000 * 1000;
    let httpResponse;
    let responseData = [];
    let downloadSize = 0;

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
            'User-Agent': this.userAgentString,
          },
          maxRedirects: this.maxRedirects,
          // httpAgent: this.agent,
          // httpsAgent: this.agent,
        });
      } catch (err) {
        return reject(new Error('Downloading the image file failed!'));
      }

      httpResponse.data.on('error', () => reject(new Error('Downloading the image file failed!')));

      if (httpResponse.headers['content-length'] && parseInt(httpResponse.headers['content-length'], 10) > maxFileSize) { // TODO: check content-type header too?
        source.cancel();
        responseData = [];
        return reject(new Error(`Image files mustn't be larger than ${prettyBytes(maxFileSize)}!`));
      }

      httpResponse.data.on('data', (chunk) => {
        downloadSize += chunk.length;

        if (downloadSize > maxFileSize) { // the 'content-length' header could be forged, so let's check twice
          source.cancel();
          responseData = [];
          reject(new Error(`Image files mustn't be larger than ${prettyBytes(maxFileSize)}!`));
        } else {
          responseData.push(chunk);
        }
      });

      httpResponse.data.on('end', () => {
        winston.debug('Size of downloaded image buffer: ', prettyBytes(downloadSize));
        resolve(Buffer.concat(responseData));
      });

      return true;
    });
  }

  async processImage(ctx, url, inParams, outParams) {
    if (ctx.isBotAdmin) {
      return this.processImageQueue(ctx, url, inParams, outParams);
    }

    return this.limiter.schedule((ctxPass, urlPass, inParamsPass, outParamsPass) => this.processImageQueue(ctxPass, urlPass, inParamsPass, outParamsPass), ctx, url, inParams, outParams);
  }

  async processImageQueue(ctx, url, inParams, outParams) {
    if (!await this.checkImageUrl(url)) {
      return ctx.reply('The image could not be found.');
    }

    let imageData;

    try {
      imageData = await ctx.main.imageHelper.downloadImage(url);
    } catch (ex) {
      return ctx.reply(ex.message);
    }

    winston.debug('Starting image identification...');

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
      return ctx.reply('This doesn\'t look like an image to me.');
    }

    winston.debug(`Image dimensions: ${imageDimentsions.width}x${imageDimentsions.height}`);

    if (imageDimentsions.width > 3000 || imageDimentsions.height > 3000) {
      return ctx.reply('Supplied image exceeds maximum resolution! (>= 3000, 3000)');
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
      return ctx.reply('Could not determine the image format.');
    }

    winston.debug(`Image format: ${imageFormat}`);

    if (imageFormat === 'GIF') {
      return ctx.reply('This command is for static images only!');
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
      raven.captureException(err);
      winston.error('GM returned an error while processing the image', err);
      return ctx.reply('An error occurred while processing the image!');
    }

    winston.debug('Image processing finished, uploading image...');

    return ctx.reply({
      files: [{
        attachment: gmOut,
        name: `image.${imageFormat.toLowerCase()}`,
      }],
    });
  }

  async getLastImage(ctx) {
    let imageURL;

    if (ctx.message.attachments.size > 0) {
      for (const attachment of ctx.message.attachments) {
        if (attachment.width && attachment.height && !imageURL) {
          imageURL = attachment.url;
        }
      }
    }

    if (imageURL) {
      return imageURL;
    }

    const messages = await ctx.channel.messages.fetch({
      limit: nconf.get('bot:maxMessagesImageSearch'),
    });

    for (const message of messages) {
      if (message.attachments.size > 0) {
        for (const attachment of message.attachments) {
          if (attachment.width && attachment.height && !imageURL) {
            imageURL = attachment.url;
          }
        }
      }

      if (message.embeds.length > 0) {
        for (const embed of message.embeds) {
          if (embed.type === 'image' && !imageURL) {
            imageURL = embed.url;
          }

          if (embed.image && !imageURL) {
            imageURL = embed.image.url;
          }
        }
      }
    }

    if (imageURL) {
      return imageURL;
    }

    throw new Error(`No images have been found in the last ${nconf.get('bot:maxMessagesImageSearch')} messages of this channel!`);
  }
}

module.exports = ImageHelper;

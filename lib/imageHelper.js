const winston = require('winston');
const axios = require('axios');
const raven = require('raven');
const nconf = require('nconf');
const Bluebird = require('bluebird');
const fileType = require('file-type');
const prettyBytes = require('pretty-bytes');
const Bottleneck = require('bottleneck');
const SocksProxyAgent = require('socks-proxy-agent');
const gm = require('gm').subClass({
  imageMagick: true,
});

const imageTypes = [
  'jpg',
  'png',
  'gif',
  'webp',
  'tif',
  'bmp',
  'jxr',
  'psd',
];

class ImageHelper {
  constructor(main) {
    this.main = main;

    this.limiter = new Bottleneck({
      maxConcurrent: nconf.get('bot:maxConcurrentImageJobs'),
    });

    this.limiter.on('idle', () => {
      winston.debug('Image job queue is now empty');
    });

    this.maxRedirects = 5;

    this.agent = new SocksProxyAgent('socks://127.0.0.1:9050');
  }

  async downloadAndAttachImage(context, url) {
    let returnedData;

    try {
      returnedData = await this.downloadImage(url);
    } catch (ex) {
      return context.reply(ex.message);
    }

    return context.reply({
      files: [{
        attachment: returnedData.imageData,
        name: `image.${returnedData.fileType}`,
      }],
    });
  }

  async downloadImage(url, fapiEndpoint = false, fapiPostData = undefined) {
    const maxFileSize = nconf.get('bot:maxDownloadFileSize') * 1024 * 1024;
    let httpResponse;
    let responseData = [];
    let downloadedBytes = 0;
    let answerError = false;
    let firstChunkChecked = false;
    let magicNumber;

    const cancelToken = axios.CancelToken;
    const source = cancelToken.source();

    url = (fapiEndpoint) ? `${nconf.get('fapi:address')}/${fapiEndpoint}` : url;

    winston.debug('Downloading image: %s', url);

    return new Bluebird(async (resolve, reject) => {
      try {
        httpResponse = await axios({
          cancelToken: source.token,
          method: (fapiEndpoint) ? 'post' : 'get',
          url,
          responseType: 'stream',
          headers: {
            'User-Agent': (fapiEndpoint) ? 'MCLBOT' : nconf.get('bot:userAgentString'),
            Authorization: (fapiEndpoint) ? `Bearer ${nconf.get('fapi:token')}` : '',
          },
          maxRedirects: this.maxRedirects,
          // httpAgent: this.agent,
          // httpsAgent: this.agent,
          data: fapiPostData,

          validateStatus() { // Axios (also Got) does not return the raw body message in the error message when in stream mode,
            return true; // so we're going to verify the status code for ourselves by disabling this check here which allows us getting the raw body in the returned stream
          },
        });
      } catch (err) { // This is still going to be executed if for example a timeout happens
        winston.warn('Error while downloading image file %s: %s', url, err.message);
        return reject(new Error(`Downloading the image file failed: ${this.main.stringUtils.prettyError(err.message)}`));
      }

      if (httpResponse.status >= 300 || httpResponse.status < 200) { // This is the actual response error check which has been (library)-disabled above
        if (!fapiEndpoint) { // We just want this behavior when using fAPI, for regular downloads we still return the error code directly
          source.cancel();

          return reject(new Error(`Downloading the image file failed! The remote server answered with HTTP code ${httpResponse.status}`));
        }

        answerError = true;
      }


      if (httpResponse.headers['content-length'] && parseInt(httpResponse.headers['content-length'], 10) > maxFileSize) {
        source.cancel();

        if (answerError) { // Although a request error occurred, the webserver is going to send us an answer bigger than we want? Huh?
          return reject(new Error(`Downloading the image file failed! The remote server answered with HTTP code ${httpResponse.status}`));
        }

        return reject(new Error(`Image files must not be larger than ${prettyBytes(maxFileSize)}!`));
      }

      httpResponse.data.on('error', () => reject(new Error('Downloading the image file failed!')));

      httpResponse.data.on('data', (chunk) => {
        if (!answerError && !firstChunkChecked) {
          magicNumber = fileType(chunk);

          if (magicNumber) {
            winston.debug('Buffer\'s magic number file type is: %s', magicNumber.ext);
          } else {
            winston.debug('Could not determine file format from the magic number!');
          }

          if (!magicNumber || !imageTypes.includes(magicNumber.ext)) {
            source.cancel();
            responseData = [];

            return reject(new Error('Downloaded file does not look like a picture'));
          }

          firstChunkChecked = true;
        }

        if (downloadedBytes + chunk.length > maxFileSize) { // the 'content-length' header could be forged or even omitted, so let's check twice
          source.cancel();
          responseData = [];

          if (answerError) { // Although a request error occurred, the webserver is going to send us an answer bigger than we want? Huh?
            return reject(new Error(`Downloading the image file failed! The remote server answered with HTTP code ${httpResponse.status}`));
          }

          return reject(new Error(`Image files must not be larger than ${prettyBytes(maxFileSize)}!`));
        }

        downloadedBytes += chunk.length;

        responseData.push(chunk);

        return true;
      });

      httpResponse.data.on('end', () => {
        if (httpResponse.data.aborted) {
          winston.debug('Download has been cancelled.');
        } else if (answerError) { // This is the part where we reject the promise with the actual error message returned by fAPI
          reject(new Error(Buffer.concat(responseData).toString('utf-8')));
        } else {
          winston.debug('Size of downloaded buffer: %s', prettyBytes(downloadedBytes));

          resolve({
            imageData: Buffer.concat(responseData),
            fileType: magicNumber.ext,
          });
        }
      });

      return true;
    }).timeout((fapiEndpoint) ? 300000 : 30000, 'Timeout while downloading the image!');
  }

  async processImage(ctx, url, inParams, outParams) {
    if (ctx.isBotAdmin) {
      return this.processImageQueue(ctx, url, inParams, outParams);
    }

    return this.limiter.schedule((ctxPass, urlPass, inParamsPass, outParamsPass) => this.processImageQueue(ctxPass, urlPass, inParamsPass, outParamsPass), ctx, url, inParams, outParams);
  }

  async processImageQueue(ctx, url, inParams, outParams) {
    let returnedData;

    try {
      returnedData = await this.downloadImage(url);
    } catch (ex) {
      return ctx.reply(ex.message);
    }

    winston.debug('Starting image identification...');

    const gmImage = gm(returnedData.imageData);

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
      winston.warn('Error while identifying image file %s: %s', url, err.message);
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

    winston.debug('Starting image processing with arguments: %s', outParams);

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
      winston.error('GM returned an error while processing the image: %s', err.message);
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

    if (ctx.message.attachments && ctx.message.attachments.size > 0) {
      for (const attachment of ctx.message.attachments.values()) {
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

    for (const message of messages.values()) {
      if (message.attachments && message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
          if (attachment.width && attachment.height && !imageURL) {
            imageURL = attachment.url;
          }
        }
      }

      if (message.embeds && message.embeds.length > 0) {
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

  async fAPI(ctx, endpoint, postData) {
    if (!nconf.get('fapi:token')) {
      return 'This bot instance does not have a fAPI key configured. Please ask matmen to obtain one.';
    }

    let returnedData;

    try {
      returnedData = await ctx.main.imageHelper.downloadImage(undefined, endpoint, postData);
    } catch (ex) {
      return ctx.reply(ex.message);
    }

    return ctx.reply({
      files: [{
        attachment: returnedData.imageData,
        name: `image.${returnedData.fileType}`,
      }],
    });
  }
}

module.exports = ImageHelper;

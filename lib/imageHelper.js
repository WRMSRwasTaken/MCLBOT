const axios = require('axios');
const Bluebird = require('bluebird');
const prettyBytes = require('pretty-bytes');

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
        reject(new Error('Downloading the image file failed!'));
      }

      httpResponse.data.on('error', (err) => {
        reject(new Error('Downloading the image file failed!'));
      });

      if (httpResponse.headers['content-length'] && parseInt(httpResponse.headers['content-length'], 10) > maxFileSize) {
        source.cancel();
        responseData = [];
        reject(new Error(`Image files mustn't be larger than ${prettyBytes(maxFileSize)}!`));
      }

      httpResponse.data.on('data', (chunk) => {
        responseData.push(chunk);

        if (Buffer.concat(responseData).length > maxFileSize) { // the 'content-length' header could be forged, so let's check twice
          source.cancel();
          responseData = [];
          reject(new Error(`Image files mustn't be larger than ${prettyBytes(maxFileSize)}!`));
        }
      });

      httpResponse.data.on('end', () => {
        resolve(Buffer.concat(responseData));
      });
    });
  }
}

module.exports = ImageHelper;

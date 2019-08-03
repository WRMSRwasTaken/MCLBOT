const axios = require('axios');
const winston = require('winston');
const nconf = require('nconf');
const fileType = require('file-type');

const allowedIDs = [
  '139114210679455744', // WRMSR#1337
  '431956009951428624', // matmen
];

module.exports = {
  owner: false,
  hide: true,
  description: 'Evaluates the text on the backend fAPI instance',
  arguments: [
    {
      label: 'code',
      type: 'string',
      infinite: true,
    },
  ],
  fn: async (ctx, code) => {
    if (!allowedIDs.includes(ctx.author.id)) {
      return 'You don\'t have the required permissions to run this command.';
    }

    let httpResponse;

    const start = Date.now();

    try {
      httpResponse = await axios({
        method: 'post',
        url: `${nconf.get('fapi:address')}/eval`,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'MCLBOT',
          Authorization: `Bearer ${nconf.get('fapi:token')}`,
        },
        timeout: 30000,
        data: {
          args: {
            text: code,
          },
        },
      });
    } catch (err) {
      if (err.response && err.response.data) {
        winston.warn('Could not evaluate text on fAPI: %s', err.response.data);
        return `Could not evaluate text on fAPI: ${err.response.data}`;
      }

      winston.warn('Could not evaluate text on fAPI backend: %s', err.message);
      return `Could not evaluate text on fAPI: ${ctx.main.stringUtils.prettyError(err.message)}`;
    }

    const time = Date.now() - start;

    if (httpResponse.data.length === 0) {
      return `eval returned nothing, :stopwatch: took ${time}ms`;
    }

    if (httpResponse.headers['content-type'] && (httpResponse.headers['content-type'] === 'application/octet-stream' || httpResponse.headers['content-type'].includes('image'))) {
      const magicNumber = fileType(httpResponse.data);

      return ctx.reply({
        files: [{
          attachment: httpResponse.data,
          name: `feval${(magicNumber) ? `.${magicNumber.ext}` : ''}`,
        }],
      });
    }

    return `eval output:\n\`\`\`js\n${httpResponse.data.toString('utf8')}\n\`\`\` \n:stopwatch: took ${time}ms`;
  },
};

const validator = require('validator');

module.exports = {
  description: 'Takes a screenshot from a webpage',
  alias: ['ss'],
  arguments: [
    {
      label: 'url',
      type: 'string',
    },
  ],
  flags: {
    width: {
      label: 'width of the screenshot image',
      type: 'integer',
      short: 'w',
      min: 1,
      max: 2000,
    },
    height: {
      label: 'height of the screenshot image',
      type: 'integer',
      short: 'h',
      min: 1,
      max: 2000,
    },
  },
  fn: async (ctx, url, flags) => {
    if (!validator.isURL(url)) {
      return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid URL entered');
    }

    if (!url.startsWith('http')) {
      url = `http://${url}`;
    }

    const width = flags.width || 1920;
    const height = flags.height || 1080;

    const renderUrl = `https://render-tron.appspot.com/screenshot/${url}?width=${width}&height=${height}`;

    try {
      const returnedData = await ctx.main.imageHelper.downloadImage(renderUrl);

      return ctx.reply({
        files: [{
          attachment: returnedData.imageData,
          name: `screenshot.${returnedData.fileType}`,
        }],
      });
    } catch (ex) {
      return 'Could not take screenshot of requested URL!';
    }
  },
};

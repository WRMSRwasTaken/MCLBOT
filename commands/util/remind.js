const prettyMs = require('pretty-ms');
const moment = require('moment');

module.exports = {
  description: 'Reminds you of something after a certain amount of time',
  alias: ['timer'],
  arguments: [
    {
      label: 'duration',
      type: 'duration',
    },
    {
      label: 'text',
      type: 'string',
      infinite: true,
    },
  ],
  fn: async (ctx, duration, text) => `Reminder set for ${prettyMs(duration * 1000, { verbose: true })} from now (at ${moment().add(duration, 'seconds').format()})`,
};

const prettyMs = require('pretty-ms');

module.exports = {
  desc: 'Show this bot\'s uptime',
  fn: ctx => `My uptime is ${prettyMs(Date.now() - ctx.main.startTime)}`,
};

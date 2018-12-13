const prettyMs = require('pretty-ms');

module.exports = {
  description: 'Show this bot\'s uptime',
  fn: ctx => `My uptime is: **${prettyMs(Date.now() - ctx.main.startTime, { verbose: true })}**`,
};

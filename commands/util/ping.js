const winston = require('winston');

module.exports = {
  description: 'Measures the latency of sending a text message and receiving it',
  alias: 'rtt',
  fn: async (ctx) => {
    if (!ctx.main.pings) {
      ctx.main.pings = {};
    }

    function sendStats(editMsg, initial, rtt, diff) {
      editMsg.edit(`:stopwatch: Message latency statistics:\`\`\`Initial send time: ${initial}ms\n        Total RTT: ${rtt}ms\n   Timestamp diff: ${diff}ms\`\`\``);
    }

    const nonce = Math.floor(Math.random() * (99999 + 1));

    ctx.main.pings[nonce] = {};

    winston.debug('Nonce is: %d', nonce);

    ctx.main.pings[nonce].message = ctx.message;

    const msgReceiver = (innerMessage) => {
      const innerNonce = innerMessage.nonce;

      if (innerMessage.author.id === ctx.main.api.user.id && ctx.main.pings[innerNonce]) {
        const receiveTimestamp = Date.now();
        ctx.main.pings[innerNonce].receiveTimestamp = receiveTimestamp;

        winston.debug('Received own message again!');

        winston.debug('Unregistering temp rtt msg handler...');
        ctx.main.api.removeListener('message', msgReceiver);

        if (ctx.main.pings[innerNonce].sendDuration) {
          winston.debug('Received own message after sending finished.');
          sendStats(ctx.main.pings[innerNonce].pingMsg, ctx.main.pings[innerNonce].sendDuration, receiveTimestamp - ctx.main.pings[innerNonce].startTimestamp, ctx.main.pings[innerNonce].startTimestamp - ctx.main.pings[innerNonce].pingMsg.createdTimestamp);
          delete ctx.main.pings[innerNonce];
        }
      }
    };

    winston.debug('Registering temp rtt msg handler...');
    ctx.main.api.on('message', msgReceiver);

    const startTimestamp = Date.now();
    ctx.main.pings[nonce].startTimestamp = startTimestamp;

    const pingMsg = await ctx.reply(':stopwatch: Pinging...', { nonce });
    ctx.main.pings[nonce].pingMsg = pingMsg;

    const sendDuration = Date.now() - startTimestamp;
    winston.debug('Sending my own message finished. Sending took %d ms.', sendDuration);
    ctx.main.pings[nonce].sendDuration = sendDuration;

    if (ctx.main.pings[nonce].receiveTimestamp) {
      winston.debug('Received own message before sending finished.');
      sendStats(pingMsg, sendDuration, ctx.main.pings[nonce].receiveTimestamp - startTimestamp, startTimestamp - pingMsg.createdTimestamp);
      delete ctx.main.pings[nonce];
    }
  },
};

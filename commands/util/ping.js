const winston = require('winston');
const prettyMs = require('pretty-ms');

module.exports = {
  description: 'Measures the latency of sending a text messageCreate and receiving it',
  alias: 'rtt',
  flags: {
    detailed: {
      short: 'd',
      description: 'Show detailed latency statistics',
    },
  },
  fn: async (ctx, flags) => {
    if (!ctx.main.pings) {
      ctx.main.pings = {};
    }

    function sendStats(editMsg, initial, rtt, diff, handle) {
      if (flags.detailed) {
        editMsg.edit(`:stopwatch: Message latency statistics:\`\`\`Websocket latency: ${prettyMs(ctx.main.api.ws.ping)}\n   Handle latency: ${handle}ms\nInitial send time: ${initial}ms\n        Total RTT: ${rtt}ms\n   Timestamp diff: ${diff}ms\`\`\``);
      } else {
        editMsg.edit(`:ping_pong: \`${rtt + handle}ms\``);
      }
    }

    const startTimestamp = Date.now();

    const userTimestamp = ctx.message.editedTimestamp || ctx.message.createdTimestamp;

    const handleLatency = (Date.now() - userTimestamp < 0) ? userTimestamp - Date.now() : Date.now() - userTimestamp;

    const nonce = Math.floor(Math.random() * (99999 + 1));

    ctx.main.pings[nonce] = {};

    winston.debug('Nonce is: %d', nonce);

    ctx.main.pings[nonce].message = ctx.message;

    const msgReceiver = (innerMessage) => {
      winston.debug('Ping message receiver received message %d', innerMessage.nonce);

      const innerNonce = innerMessage.nonce;

      if (innerMessage.author.id === ctx.main.api.user.id && ctx.main.pings[innerNonce]) {
        const receiveTimestamp = Date.now();
        ctx.main.pings[innerNonce].receiveTimestamp = receiveTimestamp;

        winston.debug('Received own messageCreate again!');

        winston.debug('Unregistering temp rtt msg handler...');
        ctx.main.api.removeListener('messageCreate', msgReceiver);

        if (ctx.main.pings[innerNonce].sendDuration) {
          winston.debug('Received own messageCreate after sending finished.');
          sendStats(ctx.main.pings[innerNonce].pingMsg, ctx.main.pings[innerNonce].sendDuration, receiveTimestamp - ctx.main.pings[innerNonce].startTimestamp, ctx.main.pings[innerNonce].startTimestamp - ctx.main.pings[innerNonce].pingMsg.createdTimestamp, handleLatency);
          delete ctx.main.pings[innerNonce];
        }
      }
    };

    winston.debug('Registering temp rtt msg handler...');
    ctx.main.api.on('messageCreate', msgReceiver);

    ctx.main.pings[nonce].startTimestamp = startTimestamp;

    const pingMsg = await ctx.reply(':stopwatch: Pinging...', { nonce });

    ctx.main.pings[nonce].pingMsg = pingMsg;

    const sendDuration = Date.now() - startTimestamp;
    winston.debug('Sending my own messageCreate finished. Sending took %d ms.', sendDuration);
    ctx.main.pings[nonce].sendDuration = sendDuration;

    if (ctx.main.pings[nonce].receiveTimestamp) {
      winston.debug('Received own messageCreate before sending finished.');
      sendStats(pingMsg, sendDuration, ctx.main.pings[nonce].receiveTimestamp - startTimestamp, startTimestamp - pingMsg.createdTimestamp, handleLatency);
      delete ctx.main.pings[nonce];
    }
  },
};

const moment = require('moment');
const prettyMs = require('pretty-ms');
const winston = require('winston');

const commands = {};

commands.ping = {
  name: 'ping',
  alias: ['pong'],
  desc: 'replies with the bot\'s ping time',
  fn: async (message) => {
    const start = Date.now();

    const pingMsg = await message.send(':stopwatch: Pinging...');

    const time = Math.round((Date.now() - start) / 2);
    pingMsg.edit(`:ping_pong: Pong! \`${time}ms\``);
  },
};

commands.rtt = {
  name: 'rtt',
  desc: 'measures the latency of sending a message and recieving it',
  fn: async (message, param, main) => {
    if (!main.pings) {
      main.pings = {};
    }

    function sendStats(editMsg, initial, rtt, diff) {
      editMsg.edit(`:stopwatch: Message latency statistics:\`\`\`Initial send time: ${initial}ms\n        Total RTT: ${rtt}ms\n   Timestamp diff: ${diff}ms\`\`\``);
    }

    const nonce = Math.floor(Math.random() * (99999 + 1));

    main.pings[nonce] = {};

    winston.debug('Nonce is:', nonce);

    main.pings[nonce].message = message;

    const msgReceiver = (innerMessage) => {
      const innerNonce = innerMessage.nonce;

      if (innerMessage.author.id === main.api.user.id && main.pings[innerNonce]) {
        const receiveTimestamp = Date.now();
        main.pings[innerNonce].receiveTimestamp = receiveTimestamp;

        winston.debug('Received own message again!');

        winston.debug('Unregistering temp rtt msg handler...');
        main.api.removeListener('message', msgReceiver);

        if (main.pings[innerNonce].sendDuration) {
          winston.debug('Received own message after sending finished.');
          sendStats(main.pings[innerNonce].pingMsg, main.pings[innerNonce].sendDuration, receiveTimestamp - main.pings[innerNonce].startTimestamp, main.pings[innerNonce].startTimestamp - main.pings[innerNonce].pingMsg.createdTimestamp);
          delete main.pings[innerNonce];
        }
      }
    };

    winston.debug('Registering temp rtt msg handler...');
    main.api.on('message', msgReceiver);

    const startTimestamp = Date.now();
    main.pings[nonce].startTimestamp = startTimestamp;

    const pingMsg = await message.send(':stopwatch: Pinging...', { nonce });
    main.pings[nonce].pingMsg = pingMsg;

    const sendDuration = Date.now() - startTimestamp;
    winston.debug('Sending my own message finished. Sending took %d ms.', sendDuration);
    main.pings[nonce].sendDuration = sendDuration;

    if (main.pings[nonce].receiveTimestamp) {
      winston.debug('Received own message before sending finished.');
      sendStats(pingMsg, sendDuration, main.pings[nonce].receiveTimestamp - startTimestamp, startTimestamp - pingMsg.createdTimestamp);
      delete main.pings[nonce];
    }
  },
};

commands.hb = {
  name: 'hb',
  desc: 'displays statistics about the bot\'s websocket heartbeats to the discord api',
  fn: (message, param, main) => {
    const pings = main.api.pings;
    let min = 0;
    let max = 0;
    let avg = 0;

    for (const ping of pings) {
      if (min === 0) min = ping;
      if (ping < min) min = ping;
      if (ping > max) max = ping;
      avg += ping;
    }

    avg /= pings.length;

    message.send(`\`\`\`Last heartbeat: ${moment(main.api.ws.connection.lastPingTimestamp).format()} (${prettyMs(Date.now() - main.api.ws.connection.lastPingTimestamp)} ago)\n   Min latency: ${min}ms\n   Max latency: ${max}ms\n   Avg latency: ${prettyMs(avg)}\`\`\``);
  },
};

module.exports = commands;

const prettyMs = require('pretty-ms');

module.exports = {
  name: 'heartbeat',
  desc: 'Displays statistics about the bot\'s websocket heartbeats to the discord api',
  alias: ['hb'],
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

    message.send(`\`\`\`Last heartbeat: ${main.stringUtils.formatUnixTimestamp(main.api.ws.connection.lastPingTimestamp)}\n   Min latency: ${min}ms\n   Max latency: ${max}ms\n   Avg latency: ${prettyMs(avg)}\`\`\``);
  }
};

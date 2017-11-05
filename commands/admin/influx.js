module.exports = {
  desc: 'Runs a SQL-like command against the bot\'s influx database',
  hide: true,
  owner: true,
  args: ['command'],
  fn: async (context, code) => {
    const start = Date.now();

    let influxOutput;

    try {
      influxOutput = await context.main.influx.query(code.join(' '));
    } catch (err) {
      return `There was an error while executing your InfluxDB query:\n\`\`\`\n${err.message}\n\`\`\``;
    }

    const time = Date.now() - start;

    influxOutput = JSON.stringify(influxOutput, null, 2);

    return `InfluxDB query returned:\n\`\`\`JSON\n${influxOutput}\n\`\`\` \n:stopwatch: took ${time}ms`;
  },
};

module.exports = {
  description: 'Runs a SQL-like command against the bot\'s InfluxDB backend',
  arguments: [
    {
      label: 'command',
      type: 'string',
      infinite: true,
    },
  ],
  fn: async (ctx, command) => {
    const start = Date.now();

    let influxOutput;

    try {
      influxOutput = await ctx.main.influx.query(command);
    } catch (err) {
      return `There was an error while executing your InfluxDB query:\n\`\`\`\n${err.message}\n\`\`\``;
    }

    const time = Date.now() - start;

    influxOutput = JSON.stringify(influxOutput, null, 2);

    return `InfluxDB query returned:\n\`\`\`JSON\n${influxOutput}\n\`\`\` \n:stopwatch: took ${time}ms`;
  },
};

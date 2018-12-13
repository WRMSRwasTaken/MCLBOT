const S = require('string');

module.exports = {
  description: 'Runs a command against the bot\'s Redis backend',
  arguments: [
    {
      label: 'command',
      type: 'string',
    },
    {
      label: 'arguments',
      type: 'string',
      infinite: true,
      optional: true,
    },
  ],
  fn: async (context, command, args) => {
    const start = Date.now();

    let redisOutput;

    if (!context.main.redis[command]) {
      return context.main.stringUtils.argumentError(context, 0, `\`${command}\` is not a valid redis command`);
    }

    try {
      if (args) {
        redisOutput = await context.main.redis[command](args);
      } else {
        redisOutput = await context.main.redis[command]();
      }
    } catch (err) {
      return `There was an error while executing your redis query:\n\`\`\`\n${err.message}\n\`\`\``;
    }

    const time = Date.now() - start;

    redisOutput = JSON.stringify(redisOutput, null, 2);

    return `Redis query returned:\n\`\`\`JSON\n${S(redisOutput).replaceAll('\\r\\n', '\n')}\n\`\`\` \n:stopwatch: took ${time}ms`;
  },
};

const util = require('util');

module.exports = {
  description: 'Evaluates JavaScript code on all bot shards',
  arguments: [
    {
      label: 'code',
      type: 'string',
      infinite: true,
    },
  ],
  fn: async (ctx, code) => {
    let evalOutput;

    const start = Date.now();

    try {
      evalOutput = await ctx.main.api.shard.broadcastEval(code);
    } catch (err) {
      return `There was an error while eval-ing your input:\n\`\`\`\n${err}\n\`\`\``;
    }

    const time = Date.now() - start;

    return `RPC output:\n\`\`\`js\n${util.inspect(evalOutput)}\n\`\`\` \ntype: ${typeof evalOutput} | :stopwatch: took ${time}ms`;
  },
};

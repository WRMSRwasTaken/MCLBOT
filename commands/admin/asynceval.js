const util = require('util');

module.exports = {
  desc: 'Runs the text asynchonously via JavaScript\'s eval',
  alias: ['aeval'],
  hide: true,
  owner: true,
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
      evalOutput = await eval(code);
    } catch (err) {
      return `There was an error while asynchonously eval-ing your input:\n\`\`\`\n${err}\n\`\`\``;
    }

    const time = Date.now() - start;

    return `async eval output:\n\`\`\`js\n${util.inspect(evalOutput)}\n\`\`\` \ntype: ${typeof evalOutput} | :stopwatch: took ${time}ms`;
  },
};

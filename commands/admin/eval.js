const util = require('util');

module.exports = {
  desc: 'Runs the text via JavaScript\'s eval',
  hide: true,
  owner: true,
  arguments: [
    {
      label: 'code',
      type: 'string',
      infinite: true,
    },
  ],
  fn: (ctx, code) => {
    let evalOutput;

    const start = Date.now();

    try {
      evalOutput = eval(code);
    } catch (err) {
      return `There was an error while eval-ing your input:\n\`\`\`\n${err}\n\`\`\``;
    }

    const time = Date.now() - start;

    return `eval output:\n\`\`\`js\n${util.inspect(evalOutput)}\n\`\`\` \ntype: ${typeof evalOutput} | :stopwatch: took ${time}ms`;
  },
};

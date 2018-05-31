const util = require('util');

module.exports = {
  description: 'test4',
  cooldown: 0,
  arguments: [
    {
      label: 'testarg',
      type: 'string',
    },
  ],
  flags: {
    testflag: {
      label: 'test',
      type: 'string',
      short: 't',
    },
  },
  fn: async (ctx, test, flags) => `eval output:\n\`\`\`js\n${util.inspect(test)}\n\`\`\`\n\`\`\`js\n${util.inspect(flags)}\n\`\`\``,
};

const childProcess = require('child_process');
const Bluebird = require('bluebird');

module.exports = {
  desc: 'Runs a system command',
  hide: true,
  owner: true,
  arguments: [
    {
      label: 'command',
      type: 'string',
      infinite: true,
    },
  ],
  fn: async (ctx, command) => {
    const start = Date.now();

    return new Bluebird((resolve, reject) => {
      childProcess.exec(command, (err, stdout, stderr) => {
        if (err) {
          return resolve(`There was an error while executing your command:\`\`\`\n${err.message}\n\`\`\``);
        }

        const time = Date.now() - start;

        return resolve(`Exec returned:\nSTDOUT:\`\`\`\n${(stdout) || '<no output>'}\n\`\`\`\nSTDERR:\`\`\`\n${(stderr) || '<no output>'}\n\`\`\` \n :stopwatch: took ${time}ms`);
      });
    });
  },
};

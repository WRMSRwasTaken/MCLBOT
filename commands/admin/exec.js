const childProcess = require('child_process');
const Bluebird = require('bluebird');

module.exports = {
  desc: 'Runs a system command',
  owner: true,
  args: ['command'],
  fn: async (context, command) => {
    const start = Date.now();

    return new Bluebird((resolve, reject) => {
      childProcess.exec(command.join(' '), (err, stdout, stderr) => {
        if (err) {
          return resolve(`There was an error while executing your command:\`\`\`\n${err.message}\n\`\`\``);
        }

        const time = Date.now() - start;

        resolve(`STDOUT:\`\`\`\n${(stdout) || '<no output>'}\n\`\`\`\nSTDERR:\`\`\`\n${(stderr) || '<no output>'}\n\`\`\` \n :stopwatch: Execution took ${time}ms`);
      });
    });
  },
};

const childProcess = require('child_process');
const Bluebird = require('bluebird');

module.exports = {
  description: 'Runs a system command',
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

        return resolve(`${(!stdout && !stderr) ? 'Exec returned no output at all' : `Exec returned:${(stdout) ? `\nSTDOUT:\`\`\`\n${stdout}\n\`\`\`` : ''}${(stderr) ? `\nSTDERR:\`\`\`\n${stderr}\n\`\`\`` : ''}`}\n :stopwatch: took ${time}ms`);
      });
    });
  },
};

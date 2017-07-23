const childProcess = require('child_process');
const prettyMs = require('pretty-ms');
const prettyBytes = require('pretty-bytes');
const winston = require('winston');
const Bluebird = require('bluebird');

const commands = {};

commands.eval = {
  name: 'eval',
  desc: 'Runs the text via JavaScript\'s eval()',
  hide: true,
  owner: true,
  args: ['code'],
  fn: (message, param, main) => {
    let evalOutput;
    let retMsg;

    const start = Date.now();

    try {
      evalOutput = eval(param);
    } catch (err) {
      return `There was an error while eval()-ing your input:\n\`\`\`\n${err}\n\`\`\``;
    }

    const time = Date.now() - start;

    if (evalOutput === undefined) {
      retMsg = 'eval() output:\n```JSON\nundefined\n```';
    } else if (evalOutput === null) {
      retMsg = 'eval() output:\n```JSON\nnull\n```';
    } else if (typeof evalOutput === 'object') {
      try {
        evalOutput = JSON.stringify(evalOutput, null, 2);

        retMsg = `eval() output:\n\`\`\`JSON\n${evalOutput}\n\`\`\``;
      } catch (err) {
        retMsg = `There was an error while eval()-ing your input:\n\`\`\`\n${err.message}\n\`\`\``;
      }
    } else {
      retMsg = `eval() output:\n\`\`\`\n${evalOutput.toString()}\n\`\`\``;
    }

    retMsg = `${retMsg} \n :stopwatch: eval() took ${time}ms`;

    return retMsg;
  },
};

commands.exec = {
  name: 'exec',
  desc: 'Runs a system command',
  hide: true,
  owner: true,
  args: ['command'],
  fn: async (message, param) => {
    const start = Date.now();

    return new Bluebird((resolve, reject) => {
      childProcess.exec(param, (err, stdout, stderr) => {
        if (err) {
          return resolve(`There was an error while executing your command:\`\`\`\n${err.message}\n\`\`\``);
        }

        const time = Date.now() - start;

        resolve(`STDOUT:\`\`\`\n${(stdout) || '<no output>'}\n\`\`\`\nSTDERR:\`\`\`\n${(stderr) || '<no output>'}\n\`\`\` \n :stopwatch: Execution took ${time}ms`);
      });
    });
  },
};

commands.sql = {
  name: 'sql',
  desc: 'Runs a SQL command against the bot\'s database',
  hide: true,
  owner: true,
  args: ['command'],
  fn: async (message, param, main) => {
    const start = Date.now();

    let sqlOutput;

    try {
      sqlOutput = await main.db.sequelize.query(param);
    } catch (err) {
      return `There was an error while executing your SQL query:\n\`\`\`\n${err.message}\n\`\`\``;
    }

    const time = Date.now() - start;

    sqlOutput = JSON.stringify(sqlOutput[0], null, 2);

    return `SQL query returned:\n\`\`\`JSON\n${sqlOutput}\n\`\`\` \n :stopwatch: Query took ${time}ms`;
  },
};

commands.status = {
  name: 'stats',
  desc: 'Prints the bot\'s current system status',
  fn: (message, param, main) => {
    const embed = new main.Discord.RichEmbed();

    embed.author = {
      name: 'MCLBOT\'s statistical data',
      icon_url: main.api.user.avatarURL,
    };

    embed.addField(':alarm_clock: Uptime', prettyMs(Date.now() - main.startTime));
    embed.addField(':stopwatch: Ping', `${Math.round(main.api.ping)}ms`);
    embed.addField(':floppy_disk: Memory usage', prettyBytes(process.memoryUsage().heapTotal));
    embed.addField(':gear: Cog stats', `${main.commandFilesCount} active modules containing ${main.loadedCommands} subcommands`);

    message.send({
      embed,
    });
  },
};

module.exports = commands;

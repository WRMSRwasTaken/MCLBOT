const childProcess = require('child_process');
const prettyMs = require('pretty-ms');
const prettyBytes = require('pretty-bytes');
const winston = require('winston');

const commands = {};

commands.eval = {
  name: 'eval',
  desc: 'Runs the text via JavaScript\'s eval() (bot owner only)',
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
      return `\`\`\`\n${err}\n\`\`\``;
    }

    const time = Date.now() - start;

    if (evalOutput === undefined) {
      retMsg = '```JSON\nundefined\n```';
    } else if (evalOutput === null) {
      retMsg = '```JSON\nnull\n```';
    } else if (typeof evalOutput === 'object') {
      try {
        evalOutput = JSON.stringify(evalOutput, null, 2);

        retMsg = `\`\`\`JSON\n${evalOutput}\n\`\`\``;
      } catch (err) {
        retMsg = `\`\`\`\n${err.message}\n\`\`\``;
      }
    } else {
      retMsg = `\`\`\`\n${evalOutput.toString()}\n\`\`\``;
    }

    retMsg = `${retMsg} \n :stopwatch: Took ${time}ms`;

    return retMsg;
  },
};

commands.exec = {
  name: 'exec',
  desc: 'Runs a system command',
  hide: true,
  owner: true,
  args: ['command'],
  fn: (message, param) => {
    const start = Date.now();

    childProcess.exec(param, (err, stdout, stderr) => {
      if (err) {
        message.replyFunction(`\`\`\`\n${err.message}\n\`\`\``);
        return;
      }

      const time = Date.now() - start;

      message.replyFunction(`STDOUT:\`\`\`\n${(stdout) || '<no output>'}\n\`\`\`\nSTDERR:\`\`\`\n${(stderr) || '<no output>'}\n\`\`\` \n :stopwatch: Took ${time}ms`);
    });
  },
};

commands.sql = {
  name: 'sql',
  desc: 'Runs a SQL command against the bot\'s database',
  hide: true,
  owner: true,
  args: ['command'],
  fn: (message, param, main) => {
    const start = Date.now();

    main.db.sequelize.query(param)
      .then((output) => {
        const time = Date.now() - start;

        output = JSON.stringify(output[0], null, 2);

        message.replyFunction(`\`\`\`JSON\n${output}\n\`\`\` \n :stopwatch: Took ${time}ms`);
      })
      .catch((err) => {
        message.replyFunction(`\`\`\`\n${err.message}\n\`\`\``);
      });
  },
};

commands.status = {
  name: 'status',
  desc: 'Prints the bot\'s current system status',
  fn: (message, param, main) => {
    const embed = new main.Discord.RichEmbed();

    embed.author = {
      name: 'MCLBOT\'s statistical data',
      icon_url: main.bot.user.avatarURL,
    };

    embed.addField(':alarm_clock: Uptime', prettyMs(Date.now() - main.startTime));
    embed.addField(':stopwatch: Ping', `${Math.round(main.bot.ping)}ms`);
    embed.addField(':electric_plug: Connected to', `${Math.round(main.bot.ping)}ms`);
    embed.addField(':floppy_disk: Memory usage', prettyBytes(process.memoryUsage().heapTotal));
    embed.addField(':gear: Cog stats', `${main.commandFilesCount} active modules containing ${main.loadedCommands} subcommands`);

    message.channel.send({
      embed,
    });
  },
};

module.exports = commands;

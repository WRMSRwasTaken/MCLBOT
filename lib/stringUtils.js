const _ = require('lodash');
const prettyMs = require('pretty-ms');
const moment = require('moment');

class StringUtils {
  constructor(main) {
    this.main = main;
  }

  isGuildAdmin(message) {
    return message.member.hasPermission('MANAGE_GUILD');
  }

  formatUnixTimestamp(timestamp) {
    return `${moment(timestamp).format()} (${prettyMs(Date.now() - timestamp)} ago)`;
  }

  listArgsString(commandString) {
    const command = this.main.commands[commandString];

    let args = '';
    if (command.args) {
      _.forEach(command.args, (arg) => {
        args = `${args}${(args === '') ? '' : ' '}<${arg}>`;
      });
    }
    return args;
  }

  listOptionalArgsString(commandString) {
    const command = this.main.commands[commandString];

    let optArgs = '';
    if (command.optArgs) {
      _.forEach(command.optArgs, (optArg) => {
        optArgs = `${optArgs}${(optArgs === '') ? '' : ' '}[${optArg}]`;
      });
    }
    return optArgs;
  }


  listAliasesString(commandString) {
    const command = this.main.commands[commandString];

    return (command.alias) ? command.alias.join(', ') : false;
  }

  displayCommandHelp(helpCommand) {
    const command = this.main.commands[helpCommand];

    let output = `\`\`\`Description: ${command.desc}\n`;

    if ((command.args && command.args[0]) || (command.optArgs && command.optArgs[0])) {
      output += `      Usage: ${command.name} ${this.listArgsString(command.name)}${(command.args && command.args[0]) ? ' ' : ''}${this.listOptionalArgsString(command.name)}\n`;
    }

    const aliases = this.listAliasesString(command.name);

    if (aliases) {
      output += `  Alias(es): ${aliases}`;
    }

    output += '```';
    return output;
  }

  displayHelpPage(pageNumber) {
    pageNumber = pageNumber || 1;

    if (pageNumber < 1 || pageNumber > this.main.helpPages.length) {
      pageNumber = 1;
    }

    let output = `- help, use the message reactions to paginate. Help page: ${pageNumber} / ${this.main.helpPages.length}`;

    output += `\`\`\`${this.main.helpPages[pageNumber - 1]}\`\`\``;
    output += 'To get help with specified command, type help <command>';

    return output;
  }

  argumentsError(command, subCommand, argIndex, message) {
    let firstLine = `${command.name} `;
    let secondLine = `${' '.repeat(command.name.length)} `;

    if (subCommand) {
      firstLine += `${subCommand.name} `;
      secondLine += `${' '.repeat(subCommand.name.length)} `;
    }

    const commandToHandle = subCommand || command;

    const commandParams = commandToHandle.arguments;

    for (let i = 0; i < argIndex; i += 1) {
      firstLine += `${commandParams[i].optional ? '[' : '<'}${commandParams[i].label}${commandParams[i].optional ? ']' : '>'} `;
      secondLine += ` ${' '.repeat(commandParams[i].label.length)}  `;
    }

    firstLine += `${commandParams[argIndex].optional ? '[' : '<'}${commandParams[argIndex].label}${commandParams[argIndex].optional ? ']' : '>'} `;
    secondLine += `${'^'.repeat(commandParams[argIndex].label.length + 2)} `;

    for (let i = argIndex + 1; i < commandParams.length; i += 1) {
      firstLine += `${commandParams[i].optional ? '[' : '<'}${commandParams[i].label}${commandParams[i].optional ? ']' : '>'} `;
      secondLine += ` ${' '.repeat(commandParams[i].label.length)}  `;
    }


    // if (!this.main.commands[command].args || argIndex + 1 > this.main.commands[command].args.length) {
    //   hyphenCount = this.main.commands[command].optArgs[argIndex].length + 2;
    // } else {
    //   hyphenCount = this.main.commands[command].args[argIndex].length + 2;
    // }
    //
    // let spaceCount = command.length + 1;
    //
    // if (!this.main.commands[command].args || argIndex + 1 > this.main.commands[command].args.length) {
    //   if (this.main.commands[command].args) {
    //     for (let i = 0; i < this.main.commands[command].args.length; i++) {
    //       spaceCount += this.main.commands[command].args[i].length + 3;
    //     }
    //   }
    //
    //   for (let i = 0; i < argIndex; i++) {
    //     spaceCount += this.main.commands[command].optArgs[i].length + 3;
    //   }
    // } else {
    //   for (let i = 0; i < argIndex; i++) {
    //     spaceCount += this.main.commands[command].args[i].length + 3;
    //   }
    // }

    let sendMsg = `${message}:\n\`\`\``;
    sendMsg += `${firstLine}\n${secondLine}`;
    sendMsg += '```';
    // sendMsg += ' '.repeat(spaceCount);
    // sendMsg += '^'.repeat(hyphenCount);
    // sendMsg += '```\nHelp for this command:\n';
    // sendMsg += this.displayCommandHelp(command);

    return sendMsg;
  }

  compareStrings(str1, str2) {
    let result = Math.min(str1.length, str2.length);

    for (const I1 in str1) {
      if (I1 > str2.length) {
        result--;
        continue;
      }

      let cond = str1[I1] === str2[I1];

      for (let i1 = -1; i1 <= 1; i1++) {
        if (str2[I1 + i1] !== '' && str1[I1 + i1] === str2[I1]) {
          cond = true;
          break;
        }
      }

      if (!cond) {
        result--;
      }
    }

    return result;
  }

  findRelated(str) {
    const matches = [];
    const len = str.length;
    const minimum = len * 0.5;

    _.forEach(this.main.commands, (command) => {
      if (command.hide) {
        return;
      }

      const comp = this.compareStrings(command.name, str);

      if (comp >= minimum) {
        matches.push([command.name, comp]);
      }
    });

    _.forEach(this.main.aliases, (aliasCommand, aliasName) => {
      if (this.main.commands[aliasCommand].hide) {
        return;
      }

      const comp = this.compareStrings(aliasName, str);

      if (comp >= minimum) {
        matches.push([aliasName, comp]);
      }
    });

    matches.sort((a, b) => {
      if (a[1] < b[1]) {
        return 1;
      }
      return -1;
    });

    return (matches[0] && matches[0][1] > 1) ? matches[0][0] : false;
  }
}

module.exports = StringUtils;

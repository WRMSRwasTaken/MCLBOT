const _ = require('lodash');

function compareStrings(str1, str2) {
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

module.exports = ((main) => {
  const utils = {};

  utils.listCommandsString = () => {
    let availableCommands = '';
    _.forEach(main.commands, (value, key) => {
      if (value.hide) {
        return;
      }

      availableCommands = `${availableCommands}${(availableCommands === '') ? '' : ','} ${key}`;
    });
    return availableCommands;
  };

  utils.listArgsString = (commandString) => {
    const command = main.commands[commandString];

    let args = '';
    if (command.args) {
      _.forEach(command.args, (arg) => {
        args = `${args}${(args === '') ? '' : ' '}<${arg}>`;
      });
    }
    return args;
  };

  utils.listOptionalArgsString = (commandString) => {
    const command = main.commands[commandString];

    let optArgs = '';
    if (command.optArgs) {
      _.forEach(command.optArgs, (optArg) => {
        optArgs = `${optArgs}${(optArgs === '') ? '' : ' '}[${optArg}]`;
      });
    }
    return optArgs;
  };

  utils.listAliasesString = (commandString) => {
    const command = main.commands[commandString];

    // let aliases = '';
    // if (command.alias) {
    //   _.forEach(command.alias, (alias) => {
    //     aliases = `${aliases}${(aliases === '') ? '' : ', '}${alias}`;
    //   });
    // } else {
    //   aliases = false;
    // }

    return (command.alias) ? command.alias.join(', ') : false;
  };

  utils.displayCommandHelp = (helpCommand) => {
    const command = main.commands[helpCommand];

    let output = `\`\`\`Description: ${command.desc}\n`;

    if ((command.args && command.args[0]) || (command.optArgs && command.optArgs[0])) {
      output += `      Usage: ${command.name} ${utils.listArgsString(command.name)}${(command.args && command.args[0]) ? ' ' : ''}${utils.listOptionalArgsString(command.name)}\n`;
    }

    const aliases = utils.listAliasesString(command.name);

    if (aliases) {
      output += `  Alias(es): ${aliases}`;
    }

    output += '```';
    return output;
  };

  utils.displayHelpPage = (pageNumber) => {
    pageNumber = pageNumber || 1;

    if (pageNumber < 1 || pageNumber > main.helpPages.length) {
      pageNumber = 1;
    }

    let output = `Help page: ${pageNumber} / ${main.helpPages.length}`;

    output += `\`\`\`${main.helpPages[pageNumber - 1]}\`\`\``;
    output += 'To list a page: help <page>\nTo get help with specified command, type help <command>';

    return output;
  };

  utils.findRelated = (str) => {
    const matches = [];
    const len = str.length;
    const minimum = len * 0.6;

    _.forEach(main.commands, (command) => {
      if (command.hide) {
        return;
      }

      const comp = compareStrings(command.name, str);

      if (comp >= minimum) {
        matches.push([command.name, comp]);
      }
    });

    _.forEach(main.aliases, (aliasCommand, aliasName) => {
      if (main.commands[aliasCommand].hide) {
        return;
      }

      const comp = compareStrings(aliasName, str);

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
  };

  utils.argumentsError = (command, argIndex, message) => {
    const hyphenCount = main.commands[command].args[argIndex].length + 2;

    let spaceCount = command.length + 1;

    for (let i = 0; i < argIndex; i++) {
      spaceCount += main.commands[command].args[i].length + 3;
    }

    let sendMsg = `${message}:\n\`\`\``;

    sendMsg += `${command} ${main.utils.listArgsString(command)} ${main.utils.listOptionalArgsString(command)}\n`;

    for (i = 0; i < spaceCount; i++) {
      sendMsg += ' ';
    }
    for (i = 0; i < hyphenCount; i++) {
      sendMsg += '^';
    }

    sendMsg += '```\nHelp for this command:\n';

    sendMsg += main.utils.displayCommandHelp(command);

    return sendMsg;
  };

  return utils;
});

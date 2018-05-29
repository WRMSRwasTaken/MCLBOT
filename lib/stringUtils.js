const _ = require('lodash');
const prettyMs = require('pretty-ms');
const moment = require('moment');
const XRegExp = require('xregexp');

class StringUtils {
  constructor(main) {
    this.main = main;

    this.emojiRegex = XRegExp('[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]', 'ug');

    this.customEmojiRegex = XRegExp('^<:\\w+:(?<id>\\d{10,})>$');

    this.customEmojiEndpoint = 'https://cdn.discordapp.com/emojis/';
    this.emojiEndpoint = 'https://bot.mods.nyc/twemoji/'; // Hello NotSoSuper
  }

  emojiUnicode(emoji) {
    let comp;

    if (emoji.length === 1) {
      comp = emoji.charCodeAt(0);
    }

    comp = ((emoji.charCodeAt(0) - 0xD800) * 0x400) + (emoji.charCodeAt(1) - 0xDC00) + 0x10000;

    if (comp < 0) {
      comp = emoji.charCodeAt(0);
    }

    return comp.toString(16);
  }

  async getEmojiUrl(input) {
    const isEmoji = this.emojiRegex.test(input);
    const customEmojiResult = XRegExp.exec(input, this.customEmojiRegex);

    let url;

    if (!customEmojiResult && !isEmoji) {
      return false;
    }

    if (isEmoji) {
      url = `${this.emojiEndpoint}${this.emojiUnicode(input)}.png`;
    } else {
      url = `${this.customEmojiEndpoint}${customEmojiResult.id}`;
    }

    if (!await this.main.imageHelper.checkImageUrl(url)) {
      return false;
    }

    return url;
  }

  formatUnixTimestamp(timestamp) {
    return `${moment(timestamp).format()} (${prettyMs(Date.now() - timestamp)} ago)`;
  }

  displayCommandHelp(helpCommand) {
    const command = this.main.commands[helpCommand];

    let output = `\`\`\`Description: ${command.description}\n`;

    if (command.alias) {
      if (Array.isArray(command.alias)) {
        output += `  Alias(es): ${command.alias.join(', ')}\n`;
      } else {
        output += `  Alias(es): ${command.alias}\n`;
      }
    }

    if (command.arguments) {
      output += '      Usage: ';
      _.forEach(command.arguments, (argument) => {
        output += `${(argument.optional) ? '[' : '<'}${argument.label}${(argument.optional) ? ']' : '>'} `;
      });
      output += '\n';
    } else if (!command.fn) {
      output += 'Base command is not executable. (Using a subCommand is mandatory)\n';
    }

    if (command.subcommands) {
      output += 'Subcommands: ';
      _.forEach(command.subcommands, (subcommand) => {
        output += `${subcommand.name}, `;
      });
      output += '\n';
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

  argumentError(context, argIndex, message) {
    let firstLine = `${context.command.name} `;
    let secondLine = `${' '.repeat(context.command.name.length)} `;

    if (context.subCommand) {
      firstLine += `${context.subCommand.name} `;
      secondLine += `${' '.repeat(context.subCommand.name.length)} `;
    }

    const commandToHandle = context.subCommand || context.command;

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

    let sendMsg = `${message}:\n\`\`\``;
    sendMsg += `${firstLine}\n${secondLine}`;
    sendMsg += '```';

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

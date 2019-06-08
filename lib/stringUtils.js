const _ = require('lodash');
const prettyMs = require('pretty-ms');
const moment = require('moment');
const XRegExp = require('xregexp');
const winston = require('winston');

class StringUtils {
  constructor(main) {
    this.main = main;

    this.emojiRegex = XRegExp('[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]', 'u');

    this.customEmojiRegex = XRegExp('^<a?:\\w+:(?<id>\\d{10,})>?$');

    this.customEmojiEndpoint = 'https://cdn.discordapp.com/emojis/';
    this.emojiEndpoint = 'https://bot.mods.nyc/twemoji/'; // Hello NotSoSuper

    // Regexps for the integer list parser
    this.integerRegex = XRegExp('^[0-9]+$');
    this.integerSplitRegex = XRegExp('(\\d+|-|,)');

    this.errorCodes = {
      ENOTFOUND: 'The DNS name could not be found',
      ETIMEDOUT: 'Connection timed out',
      ECONNREFUSED: 'Connection refused',
      EHOSTDOWN: 'Host is down',
      EHOSTUNREACH: 'No route to host',
    };
  }

  parseIntegerList(input, min, max) { // yup, this is somewhat copy pasted from the command handler's parseArguments() function
    let argSplitPosition = 0;
    let argSplitMatch;
    let previousNumber = false;
    let hadCommaBefore = false;
    let inList = false;
    const list = [];

    while (argSplitMatch = XRegExp.exec(input, this.integerSplitRegex, argSplitPosition)) { // eslint-disable-line no-cond-assign
      const splittedArgument = argSplitMatch[0] || argSplitMatch[1] || argSplitMatch[2];

      argSplitPosition = argSplitMatch.index + splittedArgument.length; // XRegExp ignores lastIndex, so the 'g' flag doesn't work here and we have to pass the position manually

      if (XRegExp.exec(splittedArgument, this.integerRegex)) {
        const integer = parseInt(splittedArgument, 10);

        if (Number.isNaN(integer)) {
          throw new Error('Invalid integer value');
        }

        if (min && min > integer) {
          throw new Error(`Supplied integer numbers in the list must be equal or greater than ${min}`);
        }

        if (max && max < integer) {
          throw new Error(`Supplied integer numbers in the list must be equal or less than ${max}`);
        }

        hadCommaBefore = false;

        if (!list.includes(integer)) {
          list.push(integer);
        }

        if (inList) {
          if (!previousNumber) {
            throw new Error('An internal error occurred');
          }

          if (integer < previousNumber) {
            throw new Error('Syntax error: The right number has to be greater or equal to the left number');
          }

          for (let i = previousNumber + 1; i < integer; i += 1) {
            if (!list.includes(i)) {
              list.push(i);
            }
          }

          inList = false;
        }

        previousNumber = integer;
      }

      if (splittedArgument === '-') {
        if (hadCommaBefore) {
          throw new Error('Syntax error: Expected a number after a `,`, instead saw a `-`');
        }

        if (!previousNumber) {
          throw new Error('Syntax error: `-` has no previous number');
        }

        if (inList) {
          throw new Error('Syntax error: Expected a number after a `-`, instead saw a `-`');
        }

        inList = true;
      }

      if (splittedArgument === ',') {
        if (!previousNumber) {
          throw new Error('Syntax error: `,` has no previous number');
        }

        if (inList) {
          throw new Error('Syntax error: Expected a number after a `-`, instead saw a `,`');
        }

        hadCommaBefore = true;
      }
    }

    if (hadCommaBefore) {
      throw new Error('Syntax error: `,` has no following number');
    }

    if (inList) {
      throw new Error('Syntax error: `-` has no following number');
    }

    return list.sort((a, b) => b - a);
  }

  prettyError(errorMessage) {
    for (const errorCode of Object.keys(this.errorCodes)) {
      if (errorMessage.includes(errorCode)) {
        return this.errorCodes[errorCode];
      }
    }

    return errorMessage;
  }

  emojiToCodePoint(unicodeSurrogates) { // Taken from https://github.com/twitter/twemoji
    const r = [];
    let c = 0;
    let p = 0;
    let i = 0;

    while (i < unicodeSurrogates.length) {
      c = unicodeSurrogates.charCodeAt(i++);
      if (p) {
        r.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16));
        p = 0;
      } else if (c >= 0xD800 && c <= 0xDBFF) {
        p = c;
      } else {
        r.push(c.toString(16));
      }
    }
    return r.join('-');
  }

  async getEmojiUrl(input) {
    const isEmoji = this.emojiRegex.test(input);
    const customEmojiResult = XRegExp.exec(input, this.customEmojiRegex);

    winston.debug('Tests for emoji input "%s": isEmoji: %s, customEmojiResult: %s', input, isEmoji, !!customEmojiResult);

    let url;

    if (!customEmojiResult && !isEmoji) {
      return false;
    }

    if (isEmoji) {
      url = `${this.emojiEndpoint}${this.emojiToCodePoint(input)}.png`;
    } else {
      url = `${this.customEmojiEndpoint}${customEmojiResult.id}`;
    }

    return url;
  }

  formatUnixTimestamp(timestamp, mode = 0, verbose = true) { // modes: 0 = timestamp & duration, 1 = timestamp only, 2 = duration only
    if (!timestamp) { // moment complains if not a number
      return 'N/A';
    }

    if (typeof timestamp === 'string') { // moment complains if not a number
      timestamp = Number.parseInt(timestamp, 10);
    }

    let output = '';

    if (mode < 2) {
      output += moment(timestamp).format();
    }

    if (mode === 0 || mode === 2) {
      if (mode === 0) {
        output += ' (';
      }

      if (timestamp < Date.now()) {
        output += `${prettyMs(Date.now() - timestamp, { verbose })} ago`;
      } else {
        output += `in ${prettyMs(timestamp - Date.now(), { verbose })}`;
      }

      if (mode === 0) {
        output += ')';
      }
    }

    return output;
  }

  argumentError(context, argIndex, message) {
    let firstLine = `${context.command.name} `;
    let secondLine = `${' '.repeat(context.command.name.length)} `;

    if (context.subcommand && !context.isSubcommandRedirect) {
      firstLine += `${context.subcommand.name} `;
      secondLine += `${' '.repeat(context.subcommand.name.length)} `;
    }

    const commandToHandle = context.subcommand || context.command;

    const commandParams = commandToHandle.arguments;

    for (let i = 0; i < argIndex; i += 1) {
      const label = commandParams[i].label || commandParams[i].type;

      firstLine += `${commandParams[i].optional ? '[' : '<'}${label}${commandParams[i].optional ? ']' : '>'} `;
      secondLine += ` ${' '.repeat(label.length)}  `;
    }

    const errLabel = commandParams[argIndex].label || commandParams[argIndex].type;

    firstLine += `${commandParams[argIndex].optional ? '[' : '<'}${errLabel}${commandParams[argIndex].optional ? ']' : '>'} `;
    secondLine += `${'^'.repeat(errLabel.length + 2)} `;

    for (let i = argIndex + 1; i < commandParams.length; i += 1) {
      const label = commandParams[i].label || commandParams[i].type;

      firstLine += `${commandParams[i].optional ? '[' : '<'}${label}${commandParams[i].optional ? ']' : '>'} `;
      secondLine += ` ${' '.repeat(label.length)}  `;
    }

    let sendMsg = `${message}\n\`\`\``;
    sendMsg += `${firstLine}\n${secondLine}`;
    sendMsg += '```';

    return sendMsg;
  }

  flagError(context, flag, message) {
    let firstLine = `${context.command.name} `;
    let secondLine = `${' '.repeat(context.command.name.length)} `;

    if (context.subcommand && !context.isSubcommandRedirect) {
      firstLine += `${context.subcommand.name} `;
      secondLine += `${' '.repeat(context.subcommand.name.length)} `;
    }

    const commandToHandle = context.subcommand || context.command;

    if (commandToHandle.arguments) {
      const commandParams = commandToHandle.arguments;

      for (let i = 0; i < commandParams.length; i += 1) {
        const label = commandParams[i].label || commandParams[i].type;

        firstLine += `${commandParams[i].optional ? '[' : '<'}${label}${commandParams[i].optional ? ']' : '>'} `;
        secondLine += ` ${' '.repeat(label.length)}  `;
      }
    }

    const label = flag.label || flag.type;

    firstLine += `--${flag.name} <${label}>`;
    secondLine += `  ${' '.repeat(flag.name.length)} ${'^'.repeat(label.length + 2)}`;

    let sendMsg = `${message}\n\`\`\``;
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

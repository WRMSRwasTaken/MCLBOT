const timestring = require('timestring');
const prettyMs = require('pretty-ms');

module.exports = {
  parse: (value, argument) => {
    const duration = timestring(value, 's', {
      daysPerYear: 365, // we don't want to count in leap years explicitly
    });

    if (!duration) {
      throw new Error('Invalid duration supplied');
    }

    if (argument.min && argument.min > duration) {
      throw new Error(`Duration has to be at least ${prettyMs(argument.min * 1000, { verbose: true })}`);
    }

    if (argument.max && argument.max < duration) {
      throw new Error(`Duration must not be longer than ${prettyMs(argument.max * 1000, { verbose: true })}`);
    }

    return duration;
  },
};

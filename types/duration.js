const timestring = require('timestring');

module.exports = {
  parse: (value) => {
    const duration = timestring(value);

    if (!duration) {
      throw new Error('Invalid duration supplied');
    }

    return duration;
  },
};

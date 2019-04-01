const XRegExp = require('xregexp');

const integerListRegex = XRegExp('[^0-9,-\\s]');

module.exports = {
  parse: (value, argument, context) => {
    if (argument.list) {
      if (argument.listAll && (value === '*' || value.toLowerCase() === 'all')) {
        return 'all';
      }

      if (!XRegExp.exec(value, integerListRegex)) {
        return context.main.stringUtils.parseIntegerList(value, argument.min, argument.max);
      }

      throw new Error('Invalid integer value or invalid list of integer values');
    }

    const integer = parseInt(value, 10);

    if (Number.isNaN(integer)) {
      throw new Error('Invalid integer value');
    }

    if (argument.min && argument.min > integer) {
      throw new Error(`Supplied integer number must be equal or greater than ${argument.min}`);
    }

    if (argument.max && argument.max < integer) {
      throw new Error(`Supplied integer number must be equal or less than ${argument.max}`);
    }

    return integer;
  },
};

module.exports = {
  parse: (value, argument) => {
    if (argument.min && argument.min > value.length) {
      throw new Error(`Supplied string length must be equal or greater than ${argument.min}`);
    }

    if (argument.max && argument.max < value.length) {
      throw new Error(`Supplied string length must be equal or less than ${argument.max}`);
    }

    return value;
  },
};

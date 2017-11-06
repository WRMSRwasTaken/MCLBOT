module.exports = {
  parse: (value, argument) => {
    const integer = Number.parseInt(value, 10);

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

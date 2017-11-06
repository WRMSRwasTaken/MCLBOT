module.exports = {
  parse: (value, argument) => {
    const float = Number.parseFloat(value);

    if (Number.isNaN(float)) {
      throw new Error('Invalid float value');
    }

    if (argument.min && argument.min > float) {
      throw new Error(`Supplied float number must be equal or greater than ${argument.min}`);
    }

    if (argument.max && argument.max < float) {
      throw new Error(`Supplied float number must be equal or less than ${argument.max}`);
    }

    return float;
  },
};

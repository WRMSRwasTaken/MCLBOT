const truthy = ['true', 't', 'yes', 'y', 'on', 'enable', 'enabled', '1', '+'];
const falsy = ['false', 'f', 'no', 'n', 'off', 'disable', 'disabled', '0', '-'];

module.exports = {
  parse: (value) => {
    const lc = value.toLowerCase();

    if (truthy.includes(lc)) return true;

    if (falsy.includes(lc)) return false;

    throw new Error('Unknown boolean value');
  },
};

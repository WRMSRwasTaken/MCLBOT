const crypto = require('crypto');

const hashes = crypto.getHashes();

module.exports = {
  description: 'Returns a hash for the specified input & algorithm',
  arguments: [
    {
      label: 'algorithm',
      type: 'string',
    },
    {
      label: 'input',
      type: 'string',
      infinite: true,
    },
  ],
  subcommands: {
    list: {
      description: 'List all supported hashing algorithms',
      alias: 'l',
      fn: async () => `Supported hashing algorithms (case sensitive):\n\n${hashes.join(', ')}`,
    },
  },
  fn: async (ctx, algorithm, input) => {
    if (!hashes.includes(algorithm)) {
      return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid hash algorithm given. Use `hash list` to get a list of supported hashing algorithms');
    }

    const hash = crypto.createHash(algorithm);

    hash.update(input);

    return `${algorithm} hash for input:\n\n\`${hash.digest('hex')}\``;
  },
};

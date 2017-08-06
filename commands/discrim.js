const commands = {};

commands.discrim = {
  name: 'discrim',
  desc: 'Lists all known users with this discriminator',
  optArgs: ['discriminator'],
  fn: (message, params, main) => {
    let discrim;

    if (params && /^\d{4}$/.test(params)) {
      discrim = params;
    } else {
      discrim = message.author.discriminator;
    }

    const names = main.api.users.filter(u => u.discriminator === discrim).map(u => u.tag);

    if (names.length === 0) {
      return `No users found with discriminator \`#${discrim}\``;
    }

    return `Users matching discriminator \`#${discrim}\`:\n\`\`\`${names.join('\n')}\`\`\``;
  },
};

module.exports = commands;

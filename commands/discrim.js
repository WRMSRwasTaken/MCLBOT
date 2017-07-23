const commands = {};

commands.discrim = {
  name: 'discrim',
  desc: 'Lists all known users with this discriminator',
  optArgs: ['discriminator'],
  fn: (message, params, main) => {
    const discrim = params || message.author.discriminator;

    const names = main.api.users.filter(u => u.discriminator === discrim).map(u => u.tag);

    return `Users matching discriminator \`#${discrim}\`:\n\`\`\`js\n${JSON.stringify(names, null, 4)}\`\`\``;
  },
};

module.exports = commands;

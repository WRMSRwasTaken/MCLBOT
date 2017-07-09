const commands = {};

commands.discrim = {
  name: 'discrim',
  desc: 'Lists all known users with this discriminator',
  optArgs: ['discriminator'],
  fn: (message, params, main) => {
    const discrim = params || message.author.discriminator;

    const names = [];

    for (const guild of main.bot.guilds.values()) {
      for (const member of guild.members.values()) {
        if (member.user.discriminator == discrim && !names.includes(member.user.tag)) names.push(member.user.tag);
      }
    }

    return `Users matching #${discrim}:\n\`\`\`js\n${JSON.stringify(names, null, 4)}\`\`\``;
  },
};

module.exports = commands;

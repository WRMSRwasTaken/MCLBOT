module.exports = {
  desc: 'Lists all known users with this discriminator',
  arguments: [
    {
      label: 'discriminator',
      type: 'integer',
      optional: true,
      min: 0,
      max: 9999,
      default: context => context.author.discriminator,
    },
  ],
  fn: (ctx, discrim) => {
    return `Users matching discriminator \`#${discrim}\`:\n\`\`\`\`\`\``;
    // let discrim;
    //
    // if (params && /^\d{4}$/.test(params)) {
    //   discrim = params;
    // } else {
    //   discrim = message.author.discriminator;
    // }
    //
    // const names = main.api.users.filter(u => u.discriminator === discrim).map(u => u.tag);
    //
    // if (names.length === 0) {
    //   return `No users found with discriminator \`#${discrim}\``;
    // }
    //
    // return `Users matching discriminator \`#${discrim}\`:\n\`\`\`${names.join('\n')}\`\`\``;
  },
};

module.exports = {
  parse: (value, argument, context) => {
    const member = context.main.userHelper.getGuildMember(context, value);

    if (member) {
      return member;
    }

    throw new Error('No matching guild members found');
  },

  default: context => context.member,
};

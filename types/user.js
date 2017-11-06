module.exports = {
  parse: async (value, argument, context) => {
    const user = await context.main.userHelper.getUser(context.message, value);

    if (user) {
      return user;
    }

    throw new Error('No matching users found');
  },

  default: context => context.author,
};

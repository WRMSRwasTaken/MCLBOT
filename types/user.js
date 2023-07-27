module.exports = {
  parse: async (value, argument, context) => {
    const user = await context.main.userHelper.getUser(context, value);

    if (user) {
      return user;
    }

    throw new Error((!context.guild) ? 'Invalid user ID entered (needed for this command in DM)' : 'No matching users found');
  },

  default: (context) => context.author,
};

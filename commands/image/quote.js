const moment = require('moment');

module.exports = {
  description: 'Generates a picture of a user quote',
  arguments: [
    {
      label: 'author',
      type: 'user',
    },
    {
      label: 'text',
      type: 'string',
      infinite: true,
    },
  ],
  flags: {
    light: {
      label: 'display as light themed',
      short: 'l',
    },
    compact: {
      label: 'display as compact mode',
      short: 'c',
    },
  },
  fn: async (ctx, user, text, flags) => ctx.main.imageHelper.fAPI(ctx, 'quote', {
    args: {
      message: {
        content: text,
      },
      author: {
        username: (user.member) ? user.member.displayName : user.username,
        color: (user.member) ? ctx.main.userHelper.getMemberDisplayColor(user.member, !flags.light) : '#ffffff',
        avatarURL: user.displayAvatarURL(),
        bot: user.bot,
      },
      light: flags.light,
      compact: flags.compact,
      timestamp: `Today at ${moment().format('h:mm A')}`,
    },
  }),
};

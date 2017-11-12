const winston = require('winston');

module.exports = {
  desc: 'Run a command as a specific guild member',
  hide: true,
  owner: true,
  guildOnly: true,
  arguments: [
    {
      label: 'member',
      type: 'member',
    },
    {
      label: 'command',
      type: 'string',
      infinite: true,
      optional: true,
    },
  ],
  fn: async (ctx, member, command) => {
    winston.debug(`Running command '${command}' as user ${member.user.tag}`);

    ctx.main.commandHandler.handleMessageEvent(Object.assign(ctx.message, {
      author: member.user,
      member,
      content: `<@${ctx.main.api.user.id}> ${command}`,
    }));
  },
};

const winston = require('winston');

module.exports = {
  description: 'Run a command as a specific guild member',
  guildOnly: true,
  hideTyping: true,
  arguments: [
    {
      label: 'member',
      type: 'member',
    },
    {
      label: 'command',
      type: 'string',
      infinite: true,
    },
  ],
  fn: async (ctx, member, command) => {
    winston.debug(`Running command '${command}' as user ${member.user.tag}`);

    ctx.main.commandHandler.handleMessageEvent(Object.assign({}, ctx.message, {
      guild: ctx.guild,
      channel: ctx.channel,
      author: member.user,
      member,
      content: `<@${ctx.main.api.user.id}> ${command}`,
    }));
  },
};

const Promise = require('bluebird');

const commands = {};

commands.ping = {
  name: 'ping',
  alias: ['pong'],
  desc: 'replies with the bot\'s ping time',
  fn: (message) => {
    const start = Date.now();

    message.replyFunction('Pinging...', false)
      .then((newMessage) => {
        const time = Math.round((Date.now() - start) / 2);
        newMessage.edit(`${(message.channel.type !== 'dm') ? `<@${message.author.id}>, ` : ''}:ping_pong: Pong! \`${time}ms\``);
      });
  },
};

commands.edittest = {
  name: 'edittest',
  desc: 'dunno',
  fn: (message) => {
    message.channel.send('Orig msg...')
      .then(newMessage => newMessage.edit('€ 1'))
      .then(newMessage => newMessage.edit('€ 2'))
      .then(newMessage => newMessage.edit('€ 3'));
  },
};

module.exports = commands;

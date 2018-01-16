const EventEmitter = require('events');

class ConfirmationHelper {
  constructor(main) {
    this.main = main;
  }

  removeReactions(message) {
    message.reactions.forEach((reaction) => {
      if (['✅', '❎'].includes(reaction.emoji.name)) {
        reaction.users.forEach((user) => {
          if (user.id === this.main.api.user.id || (message.guild && message.channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES'))) {
            reaction.users.remove(user);
          }
        });
      }
    });
  }

  async handleConfirm(message, invoker, emitter) {
    await message.react('✅');
    await message.react('❎');

    const reactions = await message.awaitReactions((reaction, user) => invoker.id === user.id, {
      time: 30000,
      max: 1,
    });

    const yes = reactions.has('✅') ? reactions.get('✅').users.size : 0;
    const no = reactions.has('❎') ? reactions.get('❎').users.size : 0;

    this.removeReactions(message);

    if (yes === 0 && no === 0) {
      return emitter.emit('timeout');
    }

    if (no > 0) {
      return emitter.emit('false');
    }

    return emitter.emit('true');
  }

  initConfirm(message, invoker) {
    const eventEmitter = new EventEmitter();

    this.handleConfirm(message, invoker, eventEmitter);

    return eventEmitter;
  }
}

module.exports = ConfirmationHelper;

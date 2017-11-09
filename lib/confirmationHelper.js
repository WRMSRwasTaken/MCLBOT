const EventEmitter = require('events');

class ConfirmationHelper {
  constructor(main) {
    this.main = main;
  }

  removeReactions(msg) {
    msg.reactions.forEach((reaction) => {
      if (['✅', '❎'].includes(reaction.emoji.name)) {
        if (reaction.me) {
          reaction.remove(this.main.api.user);
        }

        if (reaction.message.guild && reaction.message.channel.permissionsFor(reaction.message.guild.me).has('MANAGE_MESSAGES')) {
          reaction.users.forEach((user) => {
            reaction.remove(user);
          });
        }
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

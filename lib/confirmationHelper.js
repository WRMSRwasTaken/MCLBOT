const EventEmitter = require('events');

class ConfirmationHelper {
  constructor(main) {
    this.main = main;

    this.channels = {};
  }

  removeReactions(message) {
    for (const reaction of message.reactions) {
      if (['✅', '❎'].includes(reaction.emoji.name)) {
        for (const user of reaction.users) {
          if (user.id === this.main.api.user.id || (message.guild && message.channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES'))) {
            reaction.users.remove(user);
          }
        }
      }
    }
  }

  async handleConfirmReaction(message, invoker, emitter) {
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

  async handleConfirmMessage(message, invoker, emitter) {
    this.channels[message.channel.id] = true;

    const messages = await message.channel.awaitMessages((msg) => {
      if (invoker.id !== msg.author.id) {
        return false;
      }

      return ['y', 'yes', 'n', 'no'].includes(msg.content);
    }, {
      time: 30000,
      max: 1,
    });

    if (messages.size === 0) {
      delete this.channels[message.channel.id];

      return emitter.emit('timeout');
    }

    const confirmationMessage = messages.first();

    if (['y', 'yes'].includes(confirmationMessage.content)) {
      delete this.channels[message.channel.id];

      return emitter.emit('true');
    }

    delete this.channels[message.channel.id];

    return emitter.emit('false');
  }

  initConfirm(message, invoker) {
    const eventEmitter = new EventEmitter();

    if (message) {
      if (!message.guild || (message.guild && message.channel.permissionsFor(message.guild.me).has('ADD_REACTIONS'))) {
        this.handleConfirmReaction(message, invoker, eventEmitter);
      } else if (this.channels[message.channel.id]) {
        message.edit('There is still another command in this channel waiting for confirmation. Please handle this first before issuing a new command which needs to be confirmed.');
      } else {
        message.edit(`${message.content} Respond with \`y\` / \`yes\` to confirm or \`n\` / \`no\` to cancel the action.`);
        this.handleConfirmMessage(message, invoker, eventEmitter);
      }
    }

    return eventEmitter;
  }
}

module.exports = ConfirmationHelper;

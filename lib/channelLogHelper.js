const winston = require('winston');
const nconf = require('nconf');
const prettyMs = require('pretty-ms');

class ChannelLogHelper {
  constructor(main) {
    this.main = main;
  }

  async sendLogMessage(type, messageData) {
    if (!nconf.get('bot:logchannel') && !this.main.api.shard) { // no log channel has been set or disabled because of permission problems
      return;
    }

    messageData = messageData || {};

    if (this.main.api.shard) {
      messageData.shardID = this.main.api.shard.ids[0];
    }

    if (this.main.api.shard && !this.logChannelHere) {
      this.main.api.shard.send({
        message: type,
        messageData,
      });
    } else {
      this.sendChannelMessage({
        message: type,
        messageData,
      });
    }
  }

  async checkLogChannel() {
    if (nconf.get('bot:logchannel')) {
      winston.debug('Checking log channel permissions...');

      const logChannel = this.main.api.channels.get(nconf.get('bot:logchannel'));

      if (!logChannel) {
        if (!this.main.api.shard) {
          winston.warn('Invalid log channel! Logging will be disabled!');
          nconf.set('bot:logchannel', null);
        } else {
          winston.debug('Log channel ID does not exist on this shard...');
        }

        return;
      }

      if (!logChannel.permissionsFor(logChannel.guild.me).has('SEND_MESSAGES')) {
        winston.warn('Permissions missing for specified log channel! Logging will be disabled!');
        nconf.set('bot:logchannel', null);
        return;
      }

      winston.debug('Log channel permissions looking good, logging enabled.');

      if (this.main.api.shard) {
        this.logChannelHere = true;

        this.main.api.shard.send({
          message: 'logChannelHere',
          messageData: {
            shardID: this.main.api.shard.ids[0],
          },
        });
      }
    }
  }

  sendChannelMessage(message) {
    switch (message.message) {
      case 'guildCreate':
        this.sendGuildCreateMessage(message.messageData);
        break;
      case 'guildRemove':
        this.sendGuildRemoveMessage(message.messageData);
        break;
      case 'ready':
        this.sendReadyMessage(message.messageData);
        break;
      case 'disconnect':
        this.sendDisconnectMessage(message.messageData);
        break;
      case 'reconnecting':
        this.sendReconnectingMessage(message.messageData);
        break;
      case 'resumed':
        this.sendResumedMessage(message.messageData);
        break;
    }
  }

  sendGuildCreateMessage(data) {
    const embed = new this.main.Discord.MessageEmbed();

    const botFarm = data.botCount / data.memberCount > 0.5 && data.memberCount > 10;

    embed.setTitle(`Added to ${data.name}`);
    if (botFarm) embed.setDescription(`⚠ This server might be a bot farm (~${Math.round(data.botCount / data.memberCount * 100)}% bots)`);
    embed.addField('Users', data.memberCount, true);
    embed.addField('Bots', data.botCount, true);
    embed.addField('Bots/Users Ratio', (Math.round(data.botCount / data.memberCount * 1000) / 1000), true);
    embed.setThumbnail(data.iconURL);
    embed.setFooter(`Server ID: ${data.id}`);
    embed.setColor(botFarm ? 0xffff33 : 0x33ff33);

    this.main.api.channels.get(nconf.get('bot:logchannel')).send({
      embed,
    });
  }

  sendGuildRemoveMessage(data) {
    const embed = new this.main.Discord.MessageEmbed();

    embed.setTitle(`Removed from ${data.name}`);
    embed.addField('Users', data.memberCount, true);
    embed.addField('Bots', data.botCount, true);
    embed.addField('Bots/Users Ratio', (Math.round(data.botCount / data.memberCount * 1000) / 1000), true);
    embed.setThumbnail(data.iconURL);
    embed.setFooter(`Server ID: ${data.id}`);
    embed.setColor(0xff3333);

    this.main.api.channels.get(nconf.get('bot:logchannel')).send({
      embed,
    });
  }

  sendReadyMessage(data) {
    this.main.api.channels.get(nconf.get('bot:logchannel')).send(`${(data.shardID) ? `Shard **${data.shardID}**'s w` : 'W'}ebsocket received READY event after ${prettyMs(data.readyDuration)}`);
  }

  sendDisconnectMessage(data) {
    this.main.api.channels.get(nconf.get('bot:logchannel')).send(`${(data.shardID) ? `Shard **${data.shardID}**'s w` : 'W'}ebsocket disconnected with code ${data.event.code}`);
  }

  sendReconnectingMessage(data) {
    this.main.api.channels.get(nconf.get('bot:logchannel')).send(`${(data.shardID) ? `Shard **${data.shardID}**'s w` : 'W'}ebsocket is reconnecting`);
  }

  sendResumedMessage(data) {
    this.main.api.channels.get(nconf.get('bot:logchannel')).send(`${(data.shardID) ? `Shard **${data.shardID}**'s w` : 'W'}ebsocket resumed the connection after ${prettyMs(data.reconnectDuration)}`);
  }
}

module.exports = ChannelLogHelper;

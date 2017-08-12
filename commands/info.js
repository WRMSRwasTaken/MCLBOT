const winston = require('winston');
const prettyMs = require('pretty-ms');
const moment = require('moment');
const _ = require('lodash');

const commands = {};

commands.user = {
  name: 'user',
  desc: 'prints information about a discord user',
  optArgs: ['user id | mention | user name/tag'],
  fn: async (message, param, main) => {
    let guildMember;
    let user;

    if (!main.commandHandler.isDM(message)) {
      if (!param) {
        guildMember = message.member;
      } else {
        guildMember = await main.userHelper.getGuildMember(message, param);
      }

      user = guildMember.user;
    }

    if (!guildMember) {
      if (!param) {
        user = message.author;
      } else {
        user = await main.userHelper.getUser(param);
      }
    }

    if (!user && !guildMember) {
      return 'No user found.';
    }

    const embed = new main.Discord.RichEmbed();

    embed.author = {
      name: user.tag,
      icon_url: user.avatarURL,
    };

    embed.setThumbnail(user.avatarURL);

    embed.addField('ID', user.id);
    embed.addField('Tag', user.tag);
    if (guildMember && guildMember.nickname) embed.addField('Nickname', guildMember.nickname);
    embed.addField('Status', user.presence.status);
    if (user.presence.game) embed.addField('Playing', user.presence.game.name);
    if (guildMember) embed.addField('Guild join date', `${moment(guildMember.joinedTimestamp).format()} (${prettyMs(Date.now() - guildMember.joinedTimestamp)} ago)`);
    embed.addField('Discord join date', `${moment(user.createdTimestamp).format()} (${prettyMs(Date.now() - user.createdTimestamp)} ago)`);
    if (guildMember) {
      embed.addField(`Roles (${guildMember.roles.size})`, guildMember.roles.map(role => role.name).join(', '));
    }

    message.send({
      embed,
    });
  },
};

commands.server = {
  name: 'server',
  desc: 'prints information the current discord server',
  noDM: true,
  fn: async (message, param, main) => {
    const embed = new main.Discord.RichEmbed();

    embed.author = {
      name: message.guild.name,
      icon_url: message.guild.iconURL,
    };

    embed.setThumbnail(message.guild.iconURL);

    embed.addField('ID', message.guild.id);
    embed.addField('Owner', `<@${message.guild.owner.id}>`);
    embed.addField('Region', message.guild.region);
    embed.addField('Created', `${moment(message.guild.createdTimestamp).format()} (${prettyMs(Date.now() - message.guild.createdTimestamp)} ago)`);

    let memberOffline = 0;
    let memberOnline = 0;

    message.guild.members.forEach((member) => {
      if (member.presence.status === 'offline') memberOffline += 1;
      else memberOnline += 1;
    });

    embed.addField('Members', `Online: ${memberOnline}, Offline: ${memberOffline} (${message.guild.memberCount} total)`);

    const verificationLevels = ['none', 'low', 'medium', 'tableflip', 'double-tableflip'];

    embed.addField('Verfication level', verificationLevels[message.guild.verificationLevel]);

    let textChannels = 0;
    let voiceChannels = 0;
    let defaultChannel;

    message.guild.channels.forEach((channel) => {
      if (!defaultChannel && channel.permissionsFor(message.guild.me).has('READ_MESSAGES')) defaultChannel = channel;
      if (channel.type === 'text') textChannels += 1;
      else voiceChannels += 1;
    });

    embed.addField('Channels', `Text: ${textChannels}, Voice: ${voiceChannels} (${textChannels + voiceChannels} total)`);

    embed.addField('Verfication level', verificationLevels[message.guild.verificationLevel]);

    embed.addField('Default channel', `<#${defaultChannel.id}>`);

    embed.addField('Roles', message.guild.roles.size);

    if (message.guild.emojis.size) embed.addField(`Emojis (${message.guild.emojis.size})`, message.guild.emojis.map(emoji => `<:${emoji.name}:${emoji.id}>`).join(''));

    message.send({
      embed,
    });
  },
};

module.exports = commands;

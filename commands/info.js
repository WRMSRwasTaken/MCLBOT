const prettyMs = require('pretty-ms');
const moment = require('moment');

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
        user = await main.userHelper.fetchUserFromAPI(param);
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

    const defaultChannel = message.guild.channels.filter((channel) => {
      if (channel.type === 'text') textChannels += 1;
      else voiceChannels += 1;

      return (channel.permissionsFor(message.guild.me).has('READ_MESSAGES'));
    }).sort((c1, c2) => c1.position - c2.position).first();

    embed.addField('Channels', `Text: ${textChannels}, Voice: ${voiceChannels} (${textChannels + voiceChannels} total)`);

    embed.addField('Default channel', `<#${defaultChannel.id}>`);

    embed.addField('Roles', message.guild.roles.size);

    let emojiString = '';
    let countEmojis = 0;
    let moreEmojis = false;

    if (message.guild.emojis.size) {
      message.guild.emojis.forEach((emoji) => {
        const newEmoji = `<:${emoji.name}:${emoji.id}>`;
        if (emojiString.length + newEmoji.length <= 1024) {
          emojiString += newEmoji;
          countEmojis += 1;
        } else {
          moreEmojis = true;
        }
      });

      embed.addField(`Emojis (${message.guild.emojis.size})${(moreEmojis) ? ` (only the first ${countEmojis} are shown)` : ''}`, emojiString);
    }

    message.send({
      embed,
    });
  },
};

commands.avatar = {
  name: 'avatar',
  desc: 'get an user\'s avatar',
  fn: async (message, param, main) => {
    const user = await main.userHelper.getUser(message, param);
    return (user) ? `\`${user.tag}\`'s avatar is: ${main.imageHelper.getUserAvatar(user)}` : 'No user found.';
  },
};

module.exports = commands;

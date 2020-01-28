const XRegExp = require('xregexp');
const winston = require('winston');
const Bluebird = require('bluebird');

class UserHelper {
  constructor(main) {
    this.main = main;

    this.mentionRegex = XRegExp('^(<@!?)?(?<userID>\\d{16,})>?$');
  }

  getGuildMember(context, input) {
    winston.debug('Trying to get a guild member from supplied string: %s', input);

    const mentionResult = XRegExp.exec(input, this.mentionRegex);

    if (mentionResult) { // mentioned user or userid
      winston.debug('Is mention or user id! Getting member object from guild...');

      const mentionedMember = context.guild.members.get(mentionResult.userID);

      if (mentionedMember) {
        return mentionedMember;
      }

      winston.debug('User mention or user id could not be found in the current guild!');
      return false;
    }

    winston.debug('Not a user mention or user id! Searching guild member list...');

    let memberMatch = context.guild.members.filter((member) => {
      if (member.displayName && member.displayName.toUpperCase().includes(input.toUpperCase())) {
        return true;
      }

      return member.user.tag.toUpperCase().includes(input.toUpperCase());
    });

    winston.debug('Members found: %s', memberMatch.size);

    if (memberMatch.size === 0) {
      return false;
    }

    memberMatch = memberMatch.filter((member) => context.channel.permissionsFor(member).has('VIEW_CHANNEL'));

    if (memberMatch.size === 1) {
      return memberMatch.first();
    }

    memberMatch = memberMatch.sort((memberOne, memberTwo) => { // TODO: maybe we should query the database with one big query for the last message timestamps, but limited to like 100 max users for more precise user selection
      if (memberOne.lastMessage && memberTwo.lastMessage) {
        return memberTwo.lastMessage.createdTimestamp - memberOne.lastMessage.createdTimestamp;
      }

      if (memberOne.lastMessage) {
        return -1;
      }

      if (memberTwo.lastMessage) {
        return 1;
      }

      if (memberOne.presence.status !== 'offline' && memberTwo.presence.status === 'offline') { // get the member being online right now, if both have no sent message timestamp record
        return -1;
      }

      if (memberTwo.presence.status !== 'offline' && memberOne.presence.status === 'offline') {
        return 1;
      }

      return memberOne.joinedTimestamp - memberTwo.joinedTimestamp; // select the "older" member, if both members are online or offline
    });

    return memberMatch.first();
  }

  async getUser(context, input) {
    winston.debug('Trying to get a user from supplied string: %s', input);

    if (context && context.guild) {
      const guildMember = this.getGuildMember(context, input); // This request has been sent in a guild channel, so let's grab the user object from there

      if (guildMember) {
        guildMember.user.member = guildMember;

        return guildMember.user;
      }
    }

    const mentionResult = XRegExp.exec(input, this.mentionRegex);

    if (mentionResult && mentionResult.userID) {
      let apiResult;

      winston.debug('Fetching information from API for user id: %d', mentionResult.userID);

      try {
        apiResult = await this.main.api.users.fetch(mentionResult.userID);
      } catch (ex) {
        winston.debug('Could not fetch user information from Discord API: %s', ex.message);
        return false;
      }

      winston.debug('Successfully retrieved information for user: %s', apiResult.tag);

      return apiResult;
    }

    return false;
  }

  async getLastMessageTimestamp(context, guildMember) {
    if (guildMember.lastMessage) {
      return guildMember.lastMessage.createdTimestamp;
    }

    this.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
    const result = await this.main.db.member_messages.findOne({
      where: {
        user_id: guildMember.id,
        guild_id: context.guild.id,
      },
      order: [['timestamp', 'DESC']],
    });

    if (result) {
      return result.timestamp;
    }

    return 0;
  }

  async muteMember(context, member, duration = false, isRejoinAutoMute = false) { // TODO: check perms
    if (!isRejoinAutoMute) {
      this.main.prometheusMetrics.sqlCommands.labels('SELECT').inc();
      const alreadyMuted = await context.main.db.muted_members.findOne({
        where: {
          guild_id: context.guild.id,
          target_id: member.id,
        },
      });

      if (alreadyMuted) {
        return false;
      }
    }

    let job;

    if (duration && duration <= 60) {
      job = await context.main.jobHelper.enqueue('unmute', {}, duration);
    }

    const channels = context.guild.channels.filter((c) => {
      if (c.type !== 'text' || !member.permissionsIn(c).has('VIEW_CHANNEL')) {
        return false;
      }

      return member.permissionsIn(c).has('SEND_MESSAGES') || member.permissionsIn(c).has('ADD_REACTIONS');
    });

    context.main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
    await context.main.db.muted_members.upsert({
      guild_id: context.guild.id,
      target_id: member.id,
      invoker_id: context.author.id,
      target_tag: member.user.tag,
      expires_at: (duration) ? Date.now() + duration * 1000 : null,
      queue_id: (job) ? job.id : null,
    });

    for (const channel of channels.values()) {
      await channel.createOverwrite(member.id, {
        SEND_MESSAGES: false,
        ADD_REACTIONS: false,
      }, 'mute');
    }

    return true;
  }

  async unmuteMember(context, userID) { // TODO: don't remove the override, if it has other values set
    const channels = context.guild.channels.filter((c) => c.type === 'text' && c.permissionOverwrites.has(userID));

    for (const channel of channels.values()) {
      await channel.permissionOverwrites.get(userID).delete();
    }

    context.main.prometheusMetrics.sqlCommands.labels('DELETE').inc();
    return this.main.db.muted_members.destroy({
      where: {
        guild_id: context.guild.id,
        target_id: userID,
      },
    });
  }

  async getMultipleUsers(userIDArray) {
    const resultArray = [];

    for (const userID of userIDArray) {
      resultArray.push(this.main.api.users.fetch(userID));
    }

    winston.debug('Going to fetch user information from the discord API for %d users...', resultArray.length);

    return Bluebird.all(resultArray);
  }

  getGuildsInCommon(userID) {
    const results = [];

    for (const guild of this.main.api.guilds.values()) {
      if (guild.members.has(userID)) {
        results.push(guild.name);
      }
    }

    return results;
  }

  getMemberDisplayColor(member, darkMode = false) {
    const roles = member.roles.sort((r1, r2) => r1.position - r2.position).array();

    for (let i = roles.length - 1; i > -1; i--) {
      if (roles[i].color !== 0) {
        return roles[i].hexColor;
      }
    }

    return (darkMode) ? '#ffffff' : '#000000';
  }
}

module.exports = UserHelper;

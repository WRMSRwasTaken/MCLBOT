const XRegExp = require('xregexp');
const safe = require('safe-regex');
const winston = require('winston');
const Bluebird = require('bluebird');

class UserHelper {
  constructor(main) {
    this.main = main;

    this.mentionRegex = XRegExp('^(<@!?)?(?<userID>\\d{16,})>?$');
  }

  async getGuildMember(context, input) {
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

    let memberRegex;

    try {
      memberRegex = XRegExp(input, 'i');
    } catch (ex) {
      throw new Error('Invalid regular expression');
    }

    if (!safe(input)) {
      throw new Error('Catastrophic backtracking detected');
    }

    let memberMatch = context.guild.members
      .filter(member => XRegExp.exec(member.displayName, memberRegex) || XRegExp.exec(member.user.tag, memberRegex));

    // TODO: prioritize current channel

    winston.debug('Members found: %s', memberMatch.size);

    if (memberMatch.size === 0) {
      return false;
    }

    const messageTimestampArray = await Bluebird.all(memberMatch.map(async member => [await context.main.userHelper.getLastMessageTimestamp(context, member), member])); // we need to do a schwartzian transform, as node's sort() does not take asynchronous callbacks

    messageTimestampArray.sort((memberOne, memberTwo) => memberTwo[0] - memberOne[0]);

    if (messageTimestampArray[0] && messageTimestampArray[0][0]) {
      return messageTimestampArray[0][1];
    }

    memberMatch = memberMatch.sort((memberOne, memberTwo) => {
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

    if (context.guild) {
      const guildMember = await this.getGuildMember(context, input); // This request has been sent in a guild channel, so let's grab the user object from there

      if (guildMember) {
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

    const timestamp = await this.main.redis.get(`member_last_message:${context.guild.id}:${guildMember.user.id}`);

    this.main.prometheusMetrics.redisReads.inc();

    if (timestamp) {
      return parseInt(timestamp, 10);
    }

    return 0;
  }
}

module.exports = UserHelper;

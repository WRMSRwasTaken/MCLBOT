const XRegExp = require('xregexp');
const safe = require('safe-regex');
const winston = require('winston');

class UserHelper {
  constructor(main) {
    this.main = main;

    this.mentionRegex = XRegExp('^(<@!?)?(?<userID>\\d{16,})>?$', 'is');
  }

  getGuildMember(context, input) {
    winston.debug('Trying to get a guild member from supplied string:', input);

    const mentionResult = XRegExp.exec(input, this.mentionRegex);

    if (mentionResult && mentionResult.userID) { // mentioned user or userid
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

    const memberMatch = context.guild.members
      .filter(member => XRegExp.exec(member.displayName, memberRegex) || XRegExp.exec(member.user.tag, memberRegex))
      .sort((m1, m2) => {
        const m1Time = (m1.lastMessage && m1.lastMessage.createdTimestamp) || 0;
        const m2Time = (m2.lastMessage && m2.lastMessage.createdTimestamp) || 0;

        if (m2Time === 0 && m1Time === 0) { // both members have no last messages sent
          if (m1.presence.status !== 'offline' && m2.presence.status === 'offline') { // get the member being online right now
            return -1;
          } else if (m2.presence.status !== 'offline' && m1.presence.status === 'offline') {
            return 1;
          }

          return m1.joinedTimestamp - m2.joinedTimestamp; // select the "older" member, if both members are online of offline
        }

        return m2Time - m1Time;
      });

    winston.debug('Members found:', memberMatch.size);

    if (memberMatch.size === 0) {
      return false;
    }

    return memberMatch.first();
  }

  async getUser(context, input) {
    winston.debug('Trying to get a user from supplied string:', input);

    if (context.guild) {
      const guildMember = this.getGuildMember(context, input); // This request has been sent in a guild channel, so let's grab the user object from there

      if (guildMember) {
        return guildMember.user;
      }
    }

    const mentionResult = XRegExp.exec(input, this.mentionRegex);

    if (mentionResult && mentionResult.userID) {
      let apiResult;

      winston.debug('Fetching information from API for user id:', mentionResult.userID);

      try {
        apiResult = await this.main.api.users.fetch(mentionResult.userID);
      } catch (ex) {
        winston.debug('Could not fetch user information from Discord API', ex.message);
        return false;
      }

      winston.debug('Successfully retrieved information for user:', apiResult.tag);

      return apiResult;
    }

    return false;
  }
}

module.exports = UserHelper;

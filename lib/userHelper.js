const XRegExp = require('xregexp');
const winston = require('winston');
const BLuebird = require('bluebird');

class UserHelper {
  constructor(main) {
    this.main = main;

    this.mentionRegex = XRegExp('^(<@!?)?(?<userID> \\d*)>?$', 'isx');
  }

  async fetchUserFromAPI(argString) {
    if (!argString) {
      return false;
    }

    winston.debug('Trying to get user from supplied string:', argString);

    const userID = this.getUserIDFromString(argString);

    if (!userID) {
      return false;
    }

    try {
      return this.main.api.users.fetch(userID);
    } catch (e) {
      return false;
    }
  }

  getGuildMember(message, argString) {
    winston.debug('Trying to get a guild member from supplied string:', argString);

    const mentionResult = XRegExp.exec(argString, this.mentionRegex);

    if (mentionResult && mentionResult.userID) { // mentioned user or userid
      winston.debug('Is mention or user id! Getting member object from guild...');
      const mentionedMember = message.guild.members.get(mentionResult.userID);
      if (mentionedMember) {
        return mentionedMember;
      }

      winston.debug('Mention or user id could not be found in the current guild!');
      return false;
    }

    winston.debug('Not a mention or user id! Searching guild member list...');

    const memberMatch = message.guild.members.filter((member) => {
      if (member.user.tag.toLowerCase().includes(argString.toLowerCase())) {
        return true;
      }

      if (member.nickname && member.nickname.toLowerCase().includes(argString.toLowerCase())) {
        return true;
      }

      return false;
    }).sort((m1, m2) => {
      const m1Time = (m1.lastMessage && m1.lastMessage.createdTimestamp) || 0;
      const m2Time = (m2.lastMessage && m2.lastMessage.createdTimestamp) || 0;

      if (m2Time === 0 && m1Time === 0) {
        return m1.joinedTimestamp - m2.joinedTimestamp; // select the "older" member
      }

      return m2Time - m1Time;
    });

    winston.debug('Members found:', memberMatch.size);

    if (memberMatch.size === 0) {
      return false;
    }

    return memberMatch.first();
  }

  async getUser(message, argString) {
    winston.debug('Trying to get a user from supplied string:', argString);

    if (message.guild) {
      const guildMember = this.getGuildMember(message, argString);

      if (guildMember) {
        return guildMember.user;
      }
    }

    const mentionResult = XRegExp.exec(argString, this.mentionRegex);

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

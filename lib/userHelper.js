const XRegExp = require('xregexp');
const winston = require('winston');

class UserHelper {
  constructor(main) {
    this.main = main;

    this.mentionRegex = XRegExp('^<@!?(?<userID> \\d*)>$', 'isx');
  }

  getUserIDFromString(argString) {
    const mentionResult = XRegExp.exec(argString, this.mentionRegex);

    if (mentionResult) { // mentioned user
      return mentionResult.userID;
    } else if (argString.match(/^[\d]{18,}$/)) { // raw user id
      return argString;
    }

    return false;
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
      return this.main.api.fetchUser(userID);
    } catch (e) {
      return false;
    }
  }

  async getGuildMember(message, argString) {
    winston.debug('Trying to get guild member from supplied string:', argString);

    const guildMember = message.guild.members.filter((member) => {
      if (member.user.tag.toLowerCase().includes(argString.toLowerCase())) {
        return true;
      }

      if (member.nickname && member.nickname.toLowerCase().includes(argString.toLowerCase())) {
        return true;
      }

      return (this.getUserIDFromString(argString) === member.user.id);
    }).sort((m1, m2) => {
      const m1Time = (m1.lastMessage && m1.lastMessage.createdTimestamp) || 0;
      const m2Time = (m2.lastMessage && m2.lastMessage.createdTimestamp) || 0;

      return m1Time - m2Time;
    }).first();

    return guildMember || false;
  }

  async getUser(message, argString) {
    if (!argString) {
      return message.author;
    }

    let user;

    user = await this.fetchUserFromAPI(argString);

    if (user) {
      return user;
    } else if (this.main.commandHandler.isDM(message)) {
      return false;
    }

    user = await this.getGuildMember(message, argString);

    return (user) ? user.user : false;
  }
}

module.exports = UserHelper;

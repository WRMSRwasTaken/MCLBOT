const winston = require('winston');

const memberRegex = new RegExp('^(?:<@!?)?([0-9]+)>?$');

module.exports = {
  parse: (value, argument, context) => {
    winston.debug('Trying to get a guild member matching value:', value);

    const memberRegexExec = memberRegex.exec(value);

    if (memberRegexExec) {
      const mentionedMember = context.guild.members.get(memberRegexExec[1]);
      if (mentionedMember) {
        return mentionedMember;
      }
      throw new Error('Unknown guild member supplied.');
    }

    const memberMatch = context.guild.members.filter((member) => {
      if (member.user.tag.toLowerCase().includes(value.toLowerCase())) {
        return true;
      }

      if (member.nickname && member.nickname.toLowerCase().includes(value.toLowerCase())) {
        return true;
      }

      return (parseInt(value, 10) === member.user.id);
    }).sort((m1, m2) => {
      const m1Time = (m1.lastMessage && m1.lastMessage.createdTimestamp) || 0;
      const m2Time = (m2.lastMessage && m2.lastMessage.createdTimestamp) || 0;

      return m2Time - m1Time;
    });

    if (memberMatch.size === 0) {
      throw new Error('No guild member have been found.');
    }

    return memberMatch.first();
  },

  default: context => context.member,
};

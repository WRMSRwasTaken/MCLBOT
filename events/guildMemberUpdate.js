const winston = require('winston');

const badWords = ['shit', 'bad'];

function containsBadWord(text) {
  for (let i = 0; i < badWords.length; i += 1) {
    if (text.toLowerCase().includes(badWords[i])) {
      return true;
    }
  }

  return false;
}

module.exports = {
  fn: (main, oldMember, newMember) => {
    if (newMember.user.id !== main.api.user.id) {
      return;
    }

    if (newMember.displayName === main.api.user.username) {
      return;
    }

    winston.debug(`My display name on the server ${newMember.guild.name} (ID: ${newMember.guild.id}) has been changed from ${oldMember.displayName} to ${newMember.displayName}`);

    if (containsBadWord(newMember.displayName)) {
      winston.warn(`My new display name on the server ${newMember.guild.name} (ID: ${newMember.guild.id}) - ${newMember.displayName} - is something mean, so I am going to revert that to my old one.`);

      if (containsBadWord(oldMember.displayName)) {
        winston.warn(`Uh oh... my old nick on the server ${newMember.guild.name} (ID: ${newMember.guild.id}) - ${oldMember.displayName} - is something mean too, so I am going to revert to my default nick.`);
        newMember.guild.me.setNickname('');

        return;
      }

      newMember.guild.me.setNickname(oldMember.displayName);
    }
  },
};

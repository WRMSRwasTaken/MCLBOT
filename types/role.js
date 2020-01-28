const XRegExp = require('xregexp');
const winston = require('winston');

const roleRegex = XRegExp('^(<@&)?(?<roleID>\\d+)>?$');

module.exports = {
  parse: (value, argument, context) => {
    winston.debug('Trying to get a role from supplied string: %s', value);

    const roleResult = XRegExp.exec(value, roleRegex);

    if (roleResult) { // role mention or raw role id
      winston.debug('Is mention or role id! Getting role from guild role list...');

      const mentionedRole = context.guild.roles.get(roleResult.roleID);

      if (mentionedRole) {
        return mentionedRole;
      }

      winston.debug('Role mention or role id could not be found in the current guild!');
      throw new Error('Unknown role supplied');
    }

    winston.debug('Not a role mention or role id! Searching guild role list...');

    const roleMatches = context.guild.roles.filter((role) => role.name.toUpperCase().includes(value.toUpperCase()));

    winston.debug('Roles found: %d', roleMatches.size);

    if (roleMatches.size === 0) {
      throw new Error('No channels have been found');
    }

    return roleMatches.first();
  },

  default: (context) => context.channel,
};

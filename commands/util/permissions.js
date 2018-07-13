module.exports = {
  description: 'Prints an user\'s permissions',
  alias: ['perms'],
  guildOnly: true,
  arguments: [
    {
      label: 'member',
      type: 'member',
      infinite: true,
      optional: true,
    },
  ],
  flags: {
    channel: {
      type: 'channel',
      short: 'c',
    },
    global: {
      description: 'Show guild permissions',
      short: 'g',
    },
    true: {
      description: 'Show only permissions that the user has',
      short: 't',
    },
    false: {
      description: 'Show only permissions that the user does not have',
      short: 'f',
    },
  },
  fn: async (ctx, member, flags) => {
    let permissions;

    const channel = flags.channel || ctx.channel;

    if (flags.channel && flags.global) {
      return 'Conflicting flags: `--channel` and `--global` can not be used together.';
    }

    if (flags.true && flags.false) {
      return 'Conflicting flags: `--true` and `--false` can not be used together.';
    }

    if (flags.global) {
      permissions = member.permissions;
    } else {
      permissions = channel.permissionsFor(member);
    }

    let output = `Permissions for user ${member.user.tag} ${(flags.global) ? '' : `in channel <#${channel.id}>`}:`;

    if (flags.true) {
      output += '\n(only granted permissions are shown)';
    } else if (flags.false) {
      output += '\n(only denied permissions are shown)';
    }

    output += '```';

    let hasOutput = false;

    for (const permission of Object.keys(ctx.main.permissions)) {
      const permStatus = permissions.has(permission);

      if ((flags.true && permStatus) || (flags.false && !permStatus) || (!flags.true && !flags.false)) {
        output += `${(permStatus) ? '✅' : '❌'} ${ctx.main.permissions[permission]}\n`;
        hasOutput = true;
      }
    }

    if (!hasOutput) {
      output += '<no permissions>';
    }

    output += '```';

    return output;
  },
};

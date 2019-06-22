const axios = require('axios');
const nconf = require('nconf');
const Bluebird = require('bluebird');

module.exports = {
  description: 'Prints information about a supplied discord authentication token',
  arguments: [
    {
      label: 'token',
      type: 'string',
    },
  ],
  fn: async (ctx, token) => {
    const url = 'https://discordapp.com/api/v6/users/@me';

    let apiResponse;

    try {
      apiResponse = await Bluebird.some([
        axios({
          method: 'get',
          url,
          headers: {
            Authorization: token,
            'User-Agent': nconf.get('bot:userAgentString'),
          },
        }),
        axios({
          method: 'get',
          url,
          headers: {
            Authorization: `Bot ${token}`,
            'User-Agent': nconf.get('bot:userAgentString'),
          },
        }),
      ], 1);
    } catch (err) {
      if (err.length === 2) { // both requests failed
        return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid token');
      }

      return 'An error occurred while retrieving data from the Discord API';
    }

    if (!apiResponse[0]) {
      return 'An error occurred while retrieving data from the Discord API';
    }

    apiResponse = apiResponse[0];

    const embed = new ctx.main.Discord.MessageEmbed();

    let avatarURL;

    if (apiResponse.data.avatar) {
      avatarURL = `https://cdn.discordapp.com/avatars/${apiResponse.data.id}/${apiResponse.data.avatar}.${(apiResponse.data.avatar.startsWith('a_') ? 'gif' : 'png')}`;
    } else {
      avatarURL = `https://cdn.discordapp.com/embed/avatars/${apiResponse.data.discriminator % 5}.png`;
    }

    embed.setThumbnail(avatarURL);

    embed.addField('Tag', `${apiResponse.data.username}#${apiResponse.data.discriminator}`);

    embed.addField('ID', apiResponse.data.id);

    embed.addField('Bot', (apiResponse.data.bot) ? 'Yes' : 'No');

    embed.addField('MFA enabled', (apiResponse.data.mfa_enabled) ? 'Yes' : 'No');

    embed.addField('Verified', (apiResponse.data.verified) ? 'Yes' : 'No');

    if (apiResponse.data.locale) {
      embed.addField('Locale', apiResponse.data.locale);
    }

    if (apiResponse.data.email) {
      embed.addField('Email', apiResponse.data.email);
    }

    return ctx.reply({
      embed,
    });
  },
};

const axios = require('axios');

module.exports = {
  description: 'Prints information about a supplied discord authentication token',
  arguments: [
    {
      label: 'token',
      type: 'string',
    },
  ],
  fn: async (ctx, token) => {
    let apiResponse;

    try {
      apiResponse = await axios({
        method: 'get',
        url: 'https://discordapp.com/api/v7/users/@me',
        headers: {
          Authorization: token,
        },
      });
    } catch (err) {
      if (err.response.status === 401) {
        return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid token');
      }

      return 'An error occurred while retrieving data from the Discord API';
    }

    // const avatarUrl = `https://cdn.discordapp.com/icons/${apiResponse.data.guild.id}/${apiResponse.data.guild.icon}.png`;

    const embed = new ctx.main.Discord.MessageEmbed();

    // embed.author = {
    //   name: apiResponse.data.guild.name,
    //   icon_url: avatarUrl,
    // };
    //
    // embed.setThumbnail(avatarUrl);

    embed.addField('Tag', `${apiResponse.data.username}#${apiResponse.data.discriminator}`);

    embed.addField('ID', apiResponse.data.id);

    if (apiResponse.data.email) {
      embed.addField('Email', apiResponse.data.email);
    }

    if (apiResponse.data.phone) {
      embed.addField('Phone', apiResponse.data.phone);
    }

    return ctx.reply({
      embed,
    });
  },
};

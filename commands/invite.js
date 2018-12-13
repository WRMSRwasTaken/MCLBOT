const axios = require('axios');
const Bluebird = require('bluebird');
const os = require('os');

module.exports = {
  description: 'Prints an OAuth link to invite this bot to your discord server, or if an invite token is provided print some information about it',
  // arguments: [
  //   {
  //     label: 'token',
  //     type: 'string',
  //     optional: true,
  //   },
  // ],
  fn: async (ctx, token) => {
    // const msg = await ctx.reply('no u');
    //
    // await Bluebird.delay(2000);

    if (os.type() === 'Windows_NT') { // yea, this is my cheap ass dev detection if the bot is running on my IDE or not. I know that there are better ways to do this, but I'm too lazy for this.
      return 'This is my dev instance. You don\'t want this on your server, believe me. This one\'s not even online 24/7, lol';
    }

    return `I am still in early development, please see <https://github.com/WRMSRwasTaken/MCLBOT> first.\n\nIf you want to invite me to your server anyway, use this link:\n<https://discordapp.com/oauth2/authorize?client_id=${ctx.main.api.user.id}&scope=bot&permissions=8>\n\n(Note: The \`Administrator\` permission is required for administration / moderation commands. You can un check that but those commands will be unavailable then.)`;


    // let apiResponse;
    //
    // const url = `https://discordapp.com/api/v7/invite/${token}?with_counts=true`;
    //
    // try {
    //   apiResponse = await axios({
    //     method: 'get',
    //     url,
    //   });
    // } catch (err) {
    //   if (err.response.status === 404) {
    //     return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid token');
    //   }
    //
    //   return 'An error occurred while retrieving data from the Discord API';
    // }
    //
    // const avatarUrl = `https://cdn.discordapp.com/icons/${apiResponse.data.guild.id}/${apiResponse.data.guild.icon}.png`;
    //
    // const embed = new ctx.main.Discord.MessageEmbed();
    //
    // embed.author = {
    //   name: apiResponse.data.guild.name,
    //   icon_url: avatarUrl,
    // };
    //
    // embed.setThumbnail(avatarUrl);
    //
    // embed.addField('Server ID', apiResponse.data.guild.id);
    //
    // embed.addField('Member', `${apiResponse.data.approximate_presence_count} online, ${apiResponse.data.approximate_member_count} total`);
    //
    // if (ctx.guild && ctx.guild.channels.get(apiResponse.data.channel.id)) {
    //   embed.addField('Channel', `<#${apiResponse.data.channel.id}>`);
    // } else {
    //   embed.addField('Channel', `#${apiResponse.data.channel.name}`);
    // }
    //
    // if (apiResponse.data.inviter) {
    //   if (ctx.guild && ctx.guild.members.get(apiResponse.data.inviter.id)) {
    //     embed.addField('Invited by', `<@${apiResponse.data.inviter.id}>`);
    //   } else {
    //     embed.addField('Invited by', `${apiResponse.data.inviter.username}#${apiResponse.data.inviter.discriminator}`);
    //   }
    // }
    //
    // return ctx.reply({
    //   embed,
    // });
  },
};

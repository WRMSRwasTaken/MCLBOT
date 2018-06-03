const prettyMs = require('pretty-ms');
const prettyBytes = require('pretty-bytes');
const os = require('os');

module.exports = {
  description: 'Display some information about this bot',
  fn: async (ctx) => {
    const asciiLogo = '  __  __  ___ _    ___  ___ _____ \n' +
      ' |  \\/  |/ __| |  | _ )/ _ \\_   _|\n' +
      ' | |\\/| | (__| |__| _ \\ (_) || |  \n' +
      ' |_|  |_|\\___|____|___/\\___/ |_|  \n' +
      '                                  ';

    const repoUrl = 'https://github.com/WRMSRwasTaken/MCLBOT';

    const embed = new ctx.main.Discord.MessageEmbed();

    const creator = await ctx.main.userHelper.getUser(ctx, '139114210679455744');

    embed.setThumbnail(ctx.main.api.user.displayAvatarURL());

    embed.addField('Information', `Hello, I'm a Discord bot created by **${creator.tag}**\n\`\`\`${asciiLogo}\`\`\``);

    embed.addField('Stats', `This bot is currently on **${ctx.main.api.guilds.size}** servers serving **${ctx.main.api.users.size}** unique users\n` +
      `in **${ctx.main.api.channels.size}** channels running **${(ctx.main.api.shard) ? ctx.main.api.shard.count : 1}** shard(s) with **${ctx.main.api.voiceConnections.size}** voice connection(s)\n\n` +
      `My command count is **${Object.keys(ctx.main.commands).length}** splitted in **${Object.keys(ctx.main.categories).length}** categories`);

    embed.addField('Useful links', '~~Support guild invite~~ (none for now, might come in the future)\n' +
      '- however, you can find me on some other servers, like NotSoBot\'s\n' +
      '~~Command reference~~ (soon™)\n' +
      `[GitHub repository](${repoUrl})`);

    embed.addField('Environment status', `System load: **${(os.loadavg()[0] / os.cpus().length).toPrecision(1)}%**\n` +
    `Memory usage: **${prettyBytes(process.memoryUsage().heapTotal)}**\n` +
    `Uptime: **${prettyMs(Date.now() - ctx.main.startTime)}**\n` +
    `Online time: **${prettyMs(Date.now() - ctx.main.connectTime)}**\n` +
    `Websocket latency: **${prettyMs(ctx.main.api.ping)}**\n\n` +
    `Node.js version: **${process.version}**\n` +
    `discord.js version: **${ctx.main.Discord.version}**\n` +
    `Running on commit: [${ctx.main.version}](${repoUrl}/commit/${ctx.main.longVersion})`);

    ctx.reply({
      embed,
    });
  },
};

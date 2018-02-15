const prettyMs = require('pretty-ms');
const prettyBytes = require('pretty-bytes');

module.exports = {
  description: 'Display some statistics about this bot',
  alias: ['statistics', 'status'],
  fn: (ctx) => {
    const embed = new ctx.main.Discord.MessageEmbed();

    embed.author = {
      name: `${ctx.main.api.user.username}'s statistical data`,
      icon_url: ctx.main.api.user.displayAvatarURL(),
    };

    embed.setThumbnail(ctx.main.api.user.displayAvatarURL());

    embed.addField('Uptime', prettyMs(Date.now() - ctx.main.startTime), true);

    embed.addField('Ping', `${prettyMs(ctx.main.api.ping)}`, true);

    embed.addField('Servers', ctx.main.api.guilds.size, true);

    embed.addField('Channels', ctx.main.api.channels.size, true);

    embed.addField('Shards', (ctx.main.api.shard) ? ctx.main.api.shard.count : 'sharding disabled', true);

    embed.addField('Commands', Object.keys(ctx.main.commands).length, true);

    embed.addField('Categories', Object.keys(ctx.main.categories).length, true);

    embed.addField('Memory usage', prettyBytes(process.memoryUsage().heapTotal), true);

    embed.setFooter(`${(ctx.main.version) ? `MCLBOT#${ctx.main.version}` : 'MCLBOT'} running on node ${process.version} with discord.js ${ctx.main.Discord.version}`);

    ctx.reply({
      embed,
    });
  },
};

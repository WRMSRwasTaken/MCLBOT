const prettyMs = require('pretty-ms');
const prettyBytes = require('pretty-bytes');
const os = require('os');

module.exports = {
  description: 'Display some information about this bot',
  alias: ['about', 'status'],
  fn: async (ctx) => {
    const getCount = async (propertyName) => {
      let count;

      if (ctx.main.api.shard) {
        count = await ctx.main.api.shard.fetchClientValues(`${propertyName}.size`);

        count = count.reduce((prev, val) => prev + val, 0);
      } else {
        count = ctx.main.api[propertyName].size;
      }

      return count;
    };

    const asciiLogo = '  __  __  ___ _    ___  ___ _____ \n'
      + ' |  \\/  |/ __| |  | _ )/ _ \\_   _|\n'
      + ' | |\\/| | (__| |__| _ \\ (_) || |  \n'
      + ' |_|  |_|\\___|____|___/\\___/ |_|  \n'
      + '                                  ';

    const repoUrl = 'https://github.com/WRMSRwasTaken/MCLBOT';

    const embed = new ctx.main.Discord.MessageEmbed();

    const creatorID = '139114210679455744'; // yes, this is my Discord user id

    const creator = await ctx.main.userHelper.getUser(ctx, creatorID);

    const mentionCreator = ctx.guild && ctx.guild.members.get(creatorID);

    embed.setThumbnail(ctx.main.api.user.displayAvatarURL());

    embed.addField('Information', `Hello, I'm a Discord bot created by ${(mentionCreator) ? `<@${creatorID}>` : `**${creator.tag}**`}\n\`\`\`${asciiLogo}\`\`\``);

    embed.addField('Stats', `This bot is currently on **${await getCount('guilds')}** servers serving **${await getCount('users')}** users\n`
      + `in **${await getCount('channels')}** channels running **${(ctx.main.api.shard) ? ctx.main.api.shard.count : 1}** shard(s)\n\n`
      + `My command count is **${Object.keys(ctx.main.commands).length}** split in **${Object.keys(ctx.main.categories).length}** categories`);

    embed.addField('Useful links', '~~Support guild invite~~ (none for now, might come in the future)\n'
      + '- however, you can find me on some other servers, like NotSoBot\'s\n'
      + '~~Command reference~~ (soon™)\n'
      + `[GitHub repository](${repoUrl})`);

    let wsLatency;
    let memUsage;
    const dbConns = ctx.main.db.sequelize.connectionManager.pool._inUseObjects.length; // eslint-disable-line no-underscore-dangle

    if (ctx.main.api.shard) {
      const shardPings = await ctx.main.api.shard.fetchClientValues('ws.ping');
      wsLatency = Math.round(shardPings.reduce((p, v) => (p + v) / 2, shardPings[0]));

      const shardMemUsages = await ctx.main.api.shard.broadcastEval('process.memoryUsage().heapTotal');
      memUsage = shardMemUsages.reduce((p, v) => p + v, 0);
    } else {
      wsLatency = ctx.main.api.ws.ping;
      memUsage = process.memoryUsage().heapTotal;
    }

    embed.addField('Environment status', `System load: **${(os.loadavg()[0] / os.cpus().length).toPrecision(1)}%**\n`
      + `Memory usage: **${prettyBytes(memUsage)}**\n`
      + `Uptime: **${prettyMs(Date.now() - ctx.main.startTime)}**${(ctx.main.api.shard) ? ' (this shard only)' : ''}\n`
      + `Online time: **${prettyMs(Date.now() - ctx.main.connectTime)}**${(ctx.main.api.shard) ? ' (this shard only)' : ''}\n`
      + `Websocket latency: **${prettyMs(wsLatency)}**${(ctx.main.api.shard) ? ' (this shard only)' : ''}\n`
      + `Open database connections: **${dbConns}**${(ctx.main.api.shard) ? ' (this shard only)' : ''}\n`
      + `${(ctx.main.api.shard) ? '(for per-shard statistics see the `shards` command)\n' : ''}\n`
      + `Node.js version: **${process.version}**\n`
      + `discord.js version: **${ctx.main.Discord.version}**\n`
      + `Running on git commit: [${ctx.main.version}](${repoUrl}/commit/${ctx.main.longVersion})${(ctx.main.dirty) ? ' (dirty)' : ''}`);

    return ctx.reply({
      embed,
    });
  },
};

const prettyBytes = require('pretty-bytes');

module.exports = {
  description: 'Shows the bot\'s sharding status',
  fn: async (ctx) => { // thanks matmen for the idea
    if (!ctx.main.api.shard) {
      return 'This bot is not running in sharded mode (this bot is not on enough servers :sob:). Use `info` to get the stats of this instance.';
    }

    const tableWidths = [
      8,
      9,
      6,
      7,
      9,
    ];

    const drawTableHead = (tableCells, drawFooter = false) => {
      let topRow = '';
      let middleRow = '';
      let bottomRow = '';
      let i = 0;

      for (const tableCell of tableCells) {
        const cellContent = tableCell.toString();
        const cellWidth = tableWidths[i];

        if (i === 0) {
          topRow += (drawFooter) ? '├─' : '┌─';
          middleRow += '│ ';
          bottomRow += (drawFooter) ? '└─' : '├─';
        } else {
          topRow += (drawFooter) ? '┼─' : '┬─';
          middleRow += '│ ';
          bottomRow += (drawFooter) ? '┴─' : '┼─';
        }

        topRow += '─'.repeat(cellWidth);
        middleRow += cellContent;
        bottomRow += '─'.repeat(cellWidth);

        if (cellContent.length < cellWidth) {
          middleRow += ' '.repeat(cellWidth - cellContent.length);
        }

        topRow += '─';
        middleRow += ' ';
        bottomRow += '─';

        if (i + 1 >= tableCells.length) {
          topRow += (drawFooter) ? '┤' : '┐';
          middleRow += '│';
          bottomRow += (drawFooter) ? '┘' : '┤';
        }

        i++;
      }

      return `${topRow}\n${middleRow}\n${bottomRow}\n`;
    };

    const drawTableRow = (tableCells) => {
      let row = '';
      let i = 0;

      for (const tableCell of tableCells) {
        const cellContent = tableCell.toString();
        const cellWidth = tableWidths[i];

        row += '│ ';

        row += cellContent;

        if (cellContent.length < cellWidth) {
          row += ' '.repeat(cellWidth - cellContent.length);
        }

        row += ' ';

        if (i + 1 >= tableCells.length) {
          row += '│';
        }

        i++;
      }

      return `${row}\n`;
    };

    let list = drawTableHead([
      'Shard ID',
      'WS Ping',
      'Guilds',
      'Users',
      'Mem usage',
    ]);

    const shardPings = await ctx.main.api.shard.fetchClientValues('ws.ping');
    const shardGuilds = await ctx.main.api.shard.fetchClientValues('guilds.size');
    const shardUsers = await ctx.main.api.shard.fetchClientValues('users.size');
    const shardMemUsages = await ctx.main.api.shard.broadcastEval('process.memoryUsage().heapTotal');

    for (let shardID = 0; shardID < ctx.main.api.shard.count; shardID++) {
      if (shardGuilds[shardID] > 0) {
        list += drawTableRow([
          `${shardID === ctx.main.api.shard.id ? '> ' : '  '}${shardID}`,
          `${Math.round(shardPings[shardID])}ms`,
          shardGuilds[shardID],
          shardUsers[shardID],
          prettyBytes(shardMemUsages[shardID]),
        ]);
      } else {
        list += drawTableRow([
          `${shardID === ctx.main.api.shard.id ? '> ' : '  '}${shardID}`,
          'N/A',
          'N/A',
          'N/A',
          prettyBytes(shardMemUsages[shardID]),
        ]);
      }
    }

    const avgPing = Math.round(shardPings.reduce((p, v) => (p + v) / 2, shardPings[0]));
    const totalGuilds = shardGuilds.reduce((p, v) => p + v, 0);
    const totalUsers = shardUsers.reduce((p, v) => p + v, 0);
    const totalMemUsage = shardMemUsages.reduce((p, v) => p + v, 0);

    list += drawTableHead([
      'Total',
      `${avgPing}ms`,
      totalGuilds,
      totalUsers,
      prettyBytes(totalMemUsage),
    ], true);

    return ctx.reply(list, {
      code: 'xl',
    });
  },
};

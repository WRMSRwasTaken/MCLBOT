module.exports = {
  interval: 60 * 5,
  fn: (main) => {
    if (!main.initialized) {
      return;
    }

    main.api.guilds.forEach(async (guild) => {
      let online = 0;
      let idle = 0;
      let dnd = 0;
      let offline = 0;

      guild.members.forEach((member) => {
        switch (member.presence.status) {
          case 'online':
            online += 1;
            break;
          case 'idle':
            idle += 1;
            break;
          case 'dnd':
            dnd += 1;
            break;
          case 'offline':
            offline += 1;
            break;
          default:
            break;
        }
      });

      main.prometheusMetrics.influxWrites.inc();
      await main.influx.writePoints([
        {
          measurement: 'member_status',
          tags: {
            server_id: guild.id,
          },
          fields: {
            online,
            idle,
            dnd,
            offline,
            total: guild.memberCount,
          },
        },
      ]);
    });
  },
};

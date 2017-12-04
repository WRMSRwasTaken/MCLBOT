const express = require('express');
const _ = require('lodash');

module.exports = (main) => {
  const guildRouter = express.Router({ mergeParams: true });

  guildRouter.get('/', async (req, res, next) => {
    const guild = main.api.guilds.get(req.params.guildID);

    const cache = await main.cacheManager.getCache(`web:guild:${guild.id}:overview`, false);

    if (cache) {
      return res.json(JSON.parse(cache));
    }

    let online = 0;
    let idle = 0;
    let dnd = 0;
    let voice = 0;

    const roleDistribution = {};
    const roleDistributionArr = [];

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
        default:
          break;
      }

      if (member.voiceChannel) {
        voice += 1;
      }

      if (!roleDistribution[member.highestRole.name]) {
        roleDistribution[member.highestRole.name] = 0;
      }

      roleDistribution[member.highestRole.name] += 1;
    });

    _.forEach(roleDistribution, (count, name) => {
      roleDistributionArr.push({ key: name, y: count });
    });

    const response = {
      guild: {
        name: guild.name,
        icon: guild.iconURL({ format: 'png', size: 64 }),
        region: guild.region,
        verificationLevel: guild.verificationLevel,
        roles: guild.roles.size,
      },
      owner: {
        name: guild.owner.user.username,
        avatar: guild.owner.user.displayAvatarURL({ format: 'png', size: 64 }),
      },
      user: {
        total: guild.memberCount,
        voice,
        online,
        idle,
        dnd,
        offline: guild.memberCount - (online + idle + dnd),
      },
      roleDistribution: roleDistributionArr,
    };

    main.cacheManager.setCache(`web:guild:${guild.id}:overview`, JSON.stringify(response));

    res.json(response);
  });

  return guildRouter;
};

const axios = require('axios');
const nconf = require('nconf');
const winston = require('winston');

const regions = ['eu', 'us', 'kr', 'tw'];

const factions = {
  0: 'Alliance',
  1: 'Horde',
};

const classNames = {
  1: 'Warrior',
  2: 'Paladin',
  3: 'Hunter',
  4: 'Rogue',
  5: 'Priest',
  6: 'Death Knight',
  7: 'Shaman',
  8: 'Mage',
  9: 'Warlock',
  10: 'Monk',
  11: 'Druid',
  12: 'Demon Hunter',
};

const classColors = {
  1: 0xC79C6E,
  2: 0xF58CBA,
  3: 0xABD473,
  4: 0xFFF569,
  5: 0xFFFFFF,
  6: 0xC41F3B,
  7: 0x0070DE,
  8: 0x69CCF0,
  9: 0x9482C9,
  10: 0x00FF96,
  11: 0xFF7D0A,
  12: 0xA330C9,
};

const races = {
  1: 'Human',
  2: 'Orc',
  3: 'Dwarf',
  4: 'Night Elf',
  5: 'Undead',
  6: 'Tauren',
  7: 'Gnome',
  8: 'Troll',
  9: 'Goblin',
  10: 'Blood Elf',
  11: 'Draenei',
  22: 'Worgen',
  24: 'Pandaren',
  25: 'Alliance Pandaren',
  26: 'Horde Pandaren',
};

module.exports = {
  description: 'wow character',
  arguments: [
    {
      label: 'name',
      type: 'string',
    },
    {
      label: 'realm',
      type: 'string',
    },
    {
      label: 'region',
      type: 'string',
      optional: true,
      default: 'eu',
    },
  ],
  fn: async (ctx, name, realm, region) => {
    if (!regions.includes(region.toLowerCase())) {
      return ctx.main.stringUtils.argumentError(ctx, 2, 'Invalid region');
    }

    let apiResponse;

    const url = `https://${region}.api.battle.net/wow/character/${realm}/${encodeURIComponent(name)}?fields=items,guild,talents&apikey=${nconf.get('external:bnetapi')}`;

    winston.debug('Fetching character information with url', url);

    try {
      apiResponse = await axios({
        method: 'get',
        url,
      });
    } catch (err) {
      if (err.response && err.response.data && err.response.data) {
        if (err.response.data.reason === 'Realm not found.') {
          return ctx.main.stringUtils.argumentError(ctx, 1, 'Realm not found');
        } else if (err.response.data.reason === 'Character not found.') {
          return ctx.main.stringUtils.argumentError(ctx, 0, 'Character not found');
        }
      }

      winston.error('Error while retrieving data from the Battle.net API', err.message);

      return 'An error occurred while retrieving data from the Battle.net API';
    }

    let spec = '';

    const character = apiResponse.data;

    for (const talent of character.talents) {
      if (talent.selected) {
        spec = talent.spec.name;
      }
    }

    const embed = new ctx.main.Discord.MessageEmbed();

    embed.setColor(classColors[character.class]);

    embed.author = {
      name: `${character.name} - ${character.realm}`,
      icon_url: `https://render-${region}.worldofwarcraft.com/character/${character.thumbnail}`,
    };

    embed.setTitle(`${character.level} ${races[character.race]} ${spec} ${classNames[character.class]}`);

    embed.setThumbnail(`https://render-${region}.worldofwarcraft.com/character/${character.thumbnail}`);

    embed.addField('Item level', character.items.averageItemLevel, true);

    embed.addField('Achievement points', character.achievementPoints, true);

    embed.addField('Guild', character.guild.name, true);

    ctx.reply({
      embed,
    });
  },
};

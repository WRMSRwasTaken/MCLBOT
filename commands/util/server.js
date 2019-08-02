const XRegExp = require('xregexp');

const guildIDRegex = XRegExp('^\\d{16,}$');

module.exports = {
  description: 'Prints information about the current or a given Discord server / guild',
  alias: ['serverinfo', 's', 'sinfo', 'guild', 'g', 'guildinfo', 'ginfo'],
  arguments: [
    {
      label: 'guild id',
      type: 'string',
      optional: true,
    },
  ],
  fn: async (ctx, guildID) => {
    if (!ctx.guild && !guildID) {
      return 'This command can\'t be executed in DM without providing a server / guild ID.';
    }

    if (guildID && !XRegExp.exec(guildID, guildIDRegex)) {
      return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid server / guild ID');
    }

    let guild;

    if (!guildID || ctx.main.api.guilds.get(guildID)) { // use local RPC helper to retrieve guild information, since we're already on this shard
      guild = ctx.main.rpcHelper.getGuildInformation(guildID || ctx.guild.id);

      const guildIconFunc = guild.iconURL;

      guild.iconURL = function iconURL() {
        return guildIconFunc;
      };
    } else if (ctx.main.api.shard) {
      const rpcGuilds = await ctx.main.api.shard.broadcastEval(`this.main.rpcHelper.getGuildInformation('${guildID}')`);

      for (const rpcGuild of rpcGuilds) {
        if (rpcGuild) {
          guild = rpcGuild;

          break;
        }
      }
    }

    if (!guild) {
      return ctx.main.stringUtils.argumentError(ctx, 0, 'Unknown server / guild ID (I have to be on that server to retrieve information about it)');
    }

    const verificationLevels = ['Off', 'Low', 'Medium', 'High', 'Extreme'];

    const explicitContentFilter = ['Off', 'No role', 'All members'];

    const embed = new ctx.main.Discord.MessageEmbed();

    embed.setAuthor('Server information');

    embed.setThumbnail(guild.iconURL());

    embed.addField('Name', guild.name);

    embed.addField('ID', guild.id, true);

    embed.addField('Region', guild.region, true);

    embed.addField('Members', `Humans: **${guild.members.humans.online} / ${guild.members.humans.total}** online\nBots: **${guild.members.bots.online} / ${guild.members.bots.total}** online\nTotal: **${guild.members.humans.online + guild.members.bots.online} / ${guild.members.humans.total + guild.members.bots.total}** online`);

    embed.addField('Created', ctx.main.stringUtils.formatUnixTimestamp(guild.createdTimestamp, 0, true, true));

    embed.addField('Channels', `Text: **${guild.channels.text}**\nVoice: **${guild.channels.voice}**\nCategories: **${guild.channels.category}**\nTotal: **${guild.channels.text + guild.channels.voice + guild.channels.category}**`, true);

    if (guild.features.length) {
      embed.addField('Features', guild.features.join('\n'), true);
    }

    embed.addField('Security', `2FA required: **${(guild.security.mfaRequired) ? 'Yes' : 'No'}**\nVerification level: **${verificationLevels[guild.security.verificationLevel]}**\nExplicit content filter: **${explicitContentFilter[guild.security.explicitContentFilter]}**`);

    embed.addField('Emoji', `Regular: **${guild.emoji.regular}**\nAnimated: **${guild.emoji.animated}**\nTotal: **${guild.emoji.regular + guild.emoji.animated}**`, true);

    embed.addField('Other stuff', `Roles: **${guild.other.roles}**\nDefault channel: ${(ctx.guild.channels.get(guild.other.defaultChannel.id)) ? `<#${guild.other.defaultChannel.id}>` : `**#${guild.other.defaultChannel.name}**`}${(guild.other.systemChannel) ? `\nSystem channel: ${(ctx.guild.channels.get(guild.other.systemChannel.id)) ? `<#${guild.other.systemChannel.id}>` : `**#${guild.other.systemChannel.name}**`}` : ''}`, true);

    embed.addField('Nitro server boost', `Level: **${guild.nitro.level}**\nBoosters: **${guild.nitro.boosters}**`, true);

    if (guild.owner) {
      embed.addField('Owner', `${(ctx.guild.members.get(guild.owner.id)) ? `<@${guild.owner.id}>\n` : ''}${guild.owner.tag}\n${guild.owner.id}`, true);
    } else {
      embed.addField('Owner', 'N/A (deleted user)', true);
    }

    return ctx.reply({
      embed,
    });
  },
};

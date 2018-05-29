module.exports = {
  description: 'Display statistics about a guild member',
  guildOnly: true,
  alias: ['statistics'],
  arguments: [
    {
      label: 'member',
      type: 'member',
      infinite: true,
      optional: true,
    },
  ],
  fn: async (ctx, member) => {
    ctx.main.prometheusMetrics.influxWrites.inc();

    let memberStats = await ctx.main.influx.query(`select count(message_id) as messages, sum(attachment_count) as attachments, sum(char_count) as chars, sum(user_mention_count) as mentionedUsers, sum(word_count) as words from member_message where user_id = ${ctx.main.Influx.escape.stringLit(member.user.id)} and guild_id = ${ctx.main.Influx.escape.stringLit(ctx.guild.id)} and time > now() - 1d`);

    memberStats = memberStats[0];

    const embed = new ctx.main.Discord.MessageEmbed();

    embed.setAuthor(member.user.tag, member.user.displayAvatarURL());

    embed.setDescription('Statistics for the last 24 hours for this member');

    if (member.displayHexColor) {
      embed.setColor(member.displayHexColor);
    }

    embed.addField('Messages', (memberStats) ? memberStats.messages : 0, true);
    embed.addField('Words', (memberStats) ? memberStats.words : 0, true);
    embed.addField('Attachments', (memberStats) ? memberStats.attachments : 0, true);
    embed.addField('Characters', (memberStats) ? memberStats.chars : 0, true);
    embed.addField('Mentioned Users', (memberStats) ? memberStats.mentionedUsers : 0, true);

    ctx.reply({
      embed,
    });
  },
};

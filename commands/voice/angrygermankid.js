module.exports = {
  alias: ['ut', 'unrealtournament', 'agk'],
  guildOnly: true,
  description: 'plays a random "quote" of the angry german kid',
  fn: async ctx => ctx.main.audioHelper.playRandomSoundFile(ctx, './resources/audio/agk'),
};

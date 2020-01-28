module.exports = {
  alias: ['horn'],
  guildOnly: true,
  description: 'plays an airhorn in voice chat the invoker is currently in',
  fn: async (ctx) => ctx.main.audioHelper.playSoundFile(ctx, './resources/audio/airhorn_default.wav'),
};

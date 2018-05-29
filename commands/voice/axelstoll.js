module.exports = {
  alias: ['stoll'],
  guildOnly: true,
  description: 'plays a random quote of axel stoll in voice chat the invoker is currently in',
  fn: async ctx => ctx.main.audioHelper.playRandomSoundFile(ctx, './resources/audio/axelstoll'),
};

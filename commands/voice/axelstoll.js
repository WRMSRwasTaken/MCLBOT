const winston = require('winston');

module.exports = {
  alias: ['stoll'],
  guildOnly: true,
  description: 'plays a random quote of axel stoll in voice chat the invoker is currently in',
  fn: async (ctx) => {
    try {
      await ctx.main.audioHelper.playRandomSoundFile(ctx, './resources/audio/axelstoll');
    } catch (err) {
      winston.error('Error while playing the audio file!', err);
      return 'Ooops! I encountered an error while playing the audio file.';
    }
  },
};

const winston = require('winston');

module.exports = {
  alias: ['horn'],
  guildOnly: true,
  desc: 'plays an airhorn in voice chat the invoker is currently in',
  fn: async (ctx) => {
    try {
      await ctx.main.audioHelper.playSoundFile(ctx, './resources/audio/airhorn_default.wav');
    } catch (err) {
      winston.error('Error while playing the audio file!', err);
      return 'Ooops! I encountered an error while playing the audio file.';
    }
  },
};

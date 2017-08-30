module.exports = {
  alias: ['horn'],
  noDM: true,
  desc: 'plays an airhorn in voice chat the invoker is currently in',
  fn: async (message, params, main) => {
    try {
      await main.audioHelper.playSoundFile(message, './resources/audio/airhorn_default.wav');
    } catch (err) {
      return 'Ooops! I encountered an error while playing the audio file.';
    }
  },
};

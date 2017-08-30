module.exports = {
  alias: ['stoll'],
  noDM: true,
  desc: 'plays a random quote of axel stoll in voice chat the invoker is currently in',
  fn: async (message, params, main) => {
    try {
      await main.audioHelper.playRandomSoundFile(message, './resources/audio/axelstoll');
    } catch (err) {
      return 'Ooops! I encountered an error while playing the audio file.';
    }
  },
};

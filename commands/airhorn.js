const winston = require('winston');

const commands = {};

commands.alias = {
  name: 'airhorn',
  alias: ['horn'],
  noDM: true,
  desc: 'plays an airhorn in voice chat the invoker is currently in',
  fn: async (message, params, main) => {
    if (!message.member.voiceChannel) {
      message.send('You need to join a voice channel first!');
      return;
    }

    if (message.guild.me.voiceChannel) {
      return;
    }

    winston.debug(`Joining voice channel ${message.member.voiceChannel.name} (ID: ${message.member.voiceChannel.id}) on server ${message.guild.name} (ID: ${message.guild.id})`);

    const voiceConnection = await message.member.voiceChannel.join();

    const dispatcher = voiceConnection.playFile('./resources/audio/airhorn_default.wav');

    dispatcher.on('end', () => {
      winston.debug(`Audio file finished, leaving voice channel ${message.member.voiceChannel.name} (ID: ${message.member.voiceChannel.id}) on server ${message.guild.name} (ID: ${message.guild.id})`);

      message.member.voiceChannel.leave();
    });

    dispatcher.on('error', e => {
      console.log(e);
    });
  },
};

module.exports = commands;

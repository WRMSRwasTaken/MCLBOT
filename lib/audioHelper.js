const winston = require('winston');
const fs = require('fs-extra');
const nconf = require('nconf');

class AudioHelper {
  constructor(main) {
    this.main = main;
  }

  async playSoundFile(context, filePath) { // TODO: I need some sort of "watchdog" because when the bot fails to play the autio file, it won't leave the channel although it's in the catch block and to abort the command if connecting to the voice endpoint takes too long
    if (!context.member.voiceChannel) {
      return context.reply('You need to join a voice channel first!');
    }

    if (context.guild.me.voiceChannel) {
      winston.debug(`Already playing audio in voice channel ${context.guild.me.voiceChannel.name} (ID: ${context.guild.me.voiceChannel.id}) on server ${context.guild.name} (ID: ${context.guild.id}) - returning`);
      return false;
    }

    await fs.access(filePath);

    winston.debug(`Joining voice channel ${context.member.voiceChannel.name} (ID: ${context.member.voiceChannel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);

    const voiceConnection = await context.member.voiceChannel.join();

    winston.debug('Connected to voice server:', voiceConnection.authentication.endpoint);

    if (nconf.get('log:apidebug')) {
      voiceConnection.on('debug', debug => winston.debug(debug));
    }

    winston.debug('Playing audio file:', filePath);

    const dispatcher = voiceConnection.play(filePath);

    dispatcher.on('end', () => {
      winston.debug(`Audio file finished, leaving voice channel ${context.guild.me.voiceChannel.name} (ID: ${context.guild.me.voiceChannel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);

      context.guild.me.voiceChannel.leave();
    });

    dispatcher.on('error', (e) => {
      context.guild.me.voiceChannel.leave();

      winston.error('Error while playing audio file: %s', filePath, e);
      context.reply('Ooops! I encountered an error while playing the audio file.');
    });

    return true;
  }

  async playRandomSoundFile(context, folderPath) {
    await fs.access(folderPath);

    const soundFiles = await fs.readdir(folderPath);

    if (soundFiles.length === 0) {
      winston.error('Folder is empty:', folderPath);
      throw new Error(`Folder ${folderPath} is empty!`);
    }

    const filePath = `${folderPath}/${soundFiles[Math.floor(Math.random() * soundFiles.length)]}`;

    return this.playSoundFile(context, filePath);
  }
}

module.exports = AudioHelper;

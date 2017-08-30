const winston = require('winston');
const fs = require('fs-extra');

class AudioHelper {
  constructor(main) {
    this.main = main;
  }

  async playSoundFile(message, filePath) {
    if (!message.member.voiceChannel) {
      message.send('You need to join a voice channel first!');
      return;
    }

    if (message.guild.me.voiceChannel) {
      winston.debug(`Already playing audio in voice channel ${message.guild.me.voiceChannel.name} (ID: ${message.guild.me.voiceChannel.id}) on server ${message.guild.name} (ID: ${message.guild.id}) - returning`);
      return;
    }

    try {
      await fs.access(filePath);
    } catch (ex) {
      winston.error('Could not access file %s:', filePath, ex.message);
      throw new Error('Could not access file!');
    }

    winston.debug(`Joining voice channel ${message.member.voiceChannel.name} (ID: ${message.member.voiceChannel.id}) on server ${message.guild.name} (ID: ${message.guild.id})`);

    const voiceConnection = await message.member.voiceChannel.join();

    winston.debug('Playing audio file:', filePath);

    const dispatcher = voiceConnection.playFile(filePath);

    dispatcher.on('end', () => {
      winston.debug(`Audio file finished, leaving voice channel ${message.guild.me.voiceChannel.name} (ID: ${message.guild.me.voiceChannel.id}) on server ${message.guild.name} (ID: ${message.guild.id})`);

      message.guild.me.voiceChannel.leave();
    });

    dispatcher.on('error', (e) => {
      winston.error('Error while playing audio file: %s', filePath, e);
      throw new Error('Error while playing audio file!');
    });
  }

  async playRandomSoundFile(message, folderPath) {
    try {
      await fs.access(folderPath);
    } catch (ex) {
      winston.error('Could not access folder %s:', folderPath, ex.message);
      throw new Error('Could not access folder!');
    }

    const soundFiles = await fs.readdir(folderPath);

    if (soundFiles.length === 0) {
      winston.error('Folder is empty:', folderPath);
      throw new Error('Folder is empty!');
    }

    const filePath = `${folderPath}/${soundFiles[Math.floor(Math.random() * soundFiles.length)]}`;

    return this.playSoundFile(message, filePath);
  }
}

module.exports = AudioHelper;

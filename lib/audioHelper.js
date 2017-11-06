const winston = require('winston');
const fs = require('fs-extra');

class AudioHelper {
  constructor(main) {
    this.main = main;
  }

  async playSoundFile(context, filePath) {
    if (!context.member.voiceChannel) {
      return context.reply('You need to join a voice channel first!');
    }

    if (context.guild.me.voiceChannel) {
      winston.debug(`Already playing audio in voice channel ${context.guild.me.voiceChannel.name} (ID: ${context.guild.me.voiceChannel.id}) on server ${context.guild.name} (ID: ${context.guild.id}) - returning`);
      return false;
    }

    try {
      await fs.access(filePath);
    } catch (ex) {
      winston.error('Could not access file %s:', filePath, ex.message);
      throw new Error('Could not access file!');
    }

    winston.debug(`Joining voice channel ${context.member.voiceChannel.name} (ID: ${context.member.voiceChannel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);

    const voiceConnection = await context.member.voiceChannel.join();

    winston.debug('Playing audio file:', filePath);

    const dispatcher = voiceConnection.playFile(filePath);

    dispatcher.on('end', () => {
      winston.debug(`Audio file finished, leaving voice channel ${context.guild.me.voiceChannel.name} (ID: ${context.guild.me.voiceChannel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);

      context.guild.me.voiceChannel.leave();
    });

    dispatcher.on('error', (e) => {
      winston.error('Error while playing audio file: %s', filePath, e);
      throw new Error('Error while playing audio file!');
    });

    return true;
  }

  async playRandomSoundFile(context, folderPath) {
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

    return this.playSoundFile(context, filePath);
  }
}

module.exports = AudioHelper;

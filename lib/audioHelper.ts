import winston from 'winston';
import fs from 'fs-extra';
import nconf from 'nconf';

import {MCLBOTModule} from '../definitions.js';

export default class AudioHelper implements MCLBOTModule {
  initializeModule() {
    return;
  }

  async playSoundFile(context, filePath: string): Promise<void> {
    if (!context.member.voice.channel) {
      return context.reply('You need to join a voice channel first!');
    }

    if (context.guild.me.voice.channel) {
      winston.debug(`Already playing audio in voice channel ${context.guild.me.voice.channel.name} (ID: ${context.guild.me.voice.channel.id}) on server ${context.guild.name} (ID: ${context.guild.id}) - returning`);
      return false;
    }

    if (!context.member.voice.channel.joinable || !context.member.voice.channel.speakable) {
      return context.reply('Sorry, but I am missing permissions to connect to that voice channel or speak in that voice channel.');
    }

    if (!filePath.startsWith('http')) {
      await fs.access(filePath);
    }

    winston.debug(`Joining voice channel ${context.member.voice.channel.name} (ID: ${context.member.voice.channel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);

    let voiceConnection;

    try {
      voiceConnection = await context.member.voice.channel.join();
    } catch (ex) {
      winston.error('Could not connect to voice channel: %s', ex);
      context.reply('Ooops! I encountered an error while connecting to the voice channel.');

      // raven.captureException(ex, {
      //   extra: {
      //     guild: `${context.guild.name} (ID: ${context.guild.id})`,
      //     voiceChannel: `${context.member.voice.channel.name} (ID: ${context.member.voice.channel.id})`,
      //     user: `${context.author.tag} (ID: ${context.author.id})`,
      //     rawInput: context.message.content,
      //   },
      // });

      if (context.guild.me.voice.channel) {
        context.guild.me.voice.channel.leave();
      }

      return false;
    }

    if (nconf.get('log:apidebug') === 'true') {
      voiceConnection.on('debug', (debug) => winston.debug(debug));
    }

    winston.debug('Playing audio file: %s', filePath);

    let dispatcher;

    try {
      dispatcher = voiceConnection.play(filePath);
    } catch (ex) {
      context.guild.me.voice.channel.leave();

      winston.error('Error while playing audio file: %s', ex);
      context.reply('Ooops! I encountered an error while playing the audio file.');

      // raven.captureException(ex, {
      //   extra: {
      //     guild: `${context.guild.name} (ID: ${context.guild.id})`,
      //     voiceChannel: `${context.member.voice.channel.name} (ID: ${context.member.voice.channel.id})`,
      //     user: `${context.author.tag} (ID: ${context.author.id})`,
      //     rawInput: context.message.content,
      //   },
      // });

      return false;
    }

    dispatcher.on('end', () => {
      winston.debug(`Audio file finished, leaving voice channel ${context.guild.me.voice.channel.name} (ID: ${context.guild.me.voice.channel.id}) on server ${context.guild.name} (ID: ${context.guild.id})`);

      context.guild.me.voice.channel.leave();
    });

    dispatcher.on('error', (ex) => {
      context.guild.me.voice.channel.leave();

      winston.error('Error while playing audio file: %s', ex);
      context.reply('Ooops! I encountered an error while playing the audio file.');

      // raven.captureException(ex, {
      //   extra: {
      //     guild: `${context.guild.name} (ID: ${context.guild.id})`,
      //     voiceChannel: `${context.member.voice.channel.name} (ID: ${context.member.voice.channel.id})`,
      //     user: `${context.author.tag} (ID: ${context.author.id})`,
      //     rawInput: context.message.content,
      //   },
      // });
    });

    return true;
  }

  async playRandomSoundFile(context, folderPath) {
    await fs.access(folderPath);

    const soundFiles = await fs.readdir(folderPath);

    if (soundFiles.length === 0) {
      winston.error('Folder is empty: %s', folderPath);
      throw new Error(`Folder ${folderPath} is empty!`);
    }

    const filePath = `${folderPath}/${soundFiles[Math.floor(Math.random() * soundFiles.length)]}`;

    return this.playSoundFile(context, filePath);
  }
}

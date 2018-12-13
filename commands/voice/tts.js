const cheerio = require('cheerio');
const axios = require('axios');
const nconf = require('nconf');
const qs = require('qs');

module.exports = {
  alias: ['texttospecch'],
  description: '?',
  arguments: [
    {
      label: 'input',
      type: 'string',
      infinite: true,
    },
  ],
  flags: {
    attachment: {
      label: 'force the output to be an attachment, if the user is in a voice channel',
      short: 'a',
    },
  },
  fn: async (ctx, text, flags) => {
    const voice = ctx.guild && ctx.member.voice.channel && !flags.attachment;

    const msg = await ctx.reply('Generating audio, please wait...');

    const response = await axios({
      method: 'post',
      url: 'http://www.fromtexttospeech.com/',
      headers: {
        'User-Agent': nconf.get('bot:userAgentString'),
      },
      data: qs.stringify({
        action: 'process_text',
        language: 'German',
        speed: 0,
        voice: 'IVONA Hans22 (German)',
        input_text: text,
      }),
    });

    const $ = cheerio.load(response.data);

    const filePath = $("a:contains('Download')").attr('href');

    if (!filePath) {
      return 'TTS service returned empty output!';
    }

    await msg.delete();

    if (!voice) {
      return ctx.reply({
        files: [`http://www.fromtexttospeech.com${filePath}`],
      });
    }

    return ctx.main.audioHelper.playSoundFile(ctx, `http://www.fromtexttospeech.com${filePath}`);
  },
};

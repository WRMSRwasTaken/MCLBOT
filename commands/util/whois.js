const axios = require('axios');
const validator = require('validator');

function stringToHex(s) {
  s = unescape(encodeURIComponent(s));
  let h = '';
  let a;
  for (let i = 0; i < s.length; i++) {
    a = s.charCodeAt(i).toString(16);
    if (a.length === 1) {
      a = `0${a}`;
    }
    h += a;
  }
  return h;
}

module.exports = {
  desc: 'display information about a certain ip-address or hostname',
  arguments: [
    {
      label: 'ip | hostname',
      type: 'string',
      optional: false,
    },
  ],
  fn: async (ctx, input) => {
    if (!validator.isURL(input) && !validator.isIP(input)) {
      return ctx.reply('Not an URL nor an IP-Address!');
    }


    let httpResponse;
    const url = `http://plugin.myip.ms/hex_${stringToHex(input)}`;

    try {
      httpResponse = await axios({
        method: 'get',
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36',
        },
      });
    } catch (err) {
      return ctx.reply('WHOIS API returned no data!');
    }

    console.log(url);

    // return ctx.reply(httpResponse.data.hosting);

    ctx.reply(`:mag: WHOIS information:\`\`\`
IP: ${httpResponse.data.ip}
ISP: ${httpResponse.data.hosting}
Country: ${httpResponse.data.countryName}
\`\`\``);
  },
};

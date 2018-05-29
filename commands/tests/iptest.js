const axios = require('axios');
const SocksProxyAgent = require('socks-proxy-agent');

const agent = new SocksProxyAgent('socks://127.0.0.1:9050');

module.exports = {
  description: 'test ip',
  fn: async (ctx) => {
    const httpResponse = await axios({
      method: 'get',
      url: 'https://icanhazip.com/',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36',
      },
      httpAgent: agent,
      httpsAgent: agent,
    });

    return httpResponse.data;
  },
};

const axios = require('axios');
const validator = require('validator');
const xwhois = require('node-xwhois');
const ip = require('ip');
const Bluebird = require('bluebird');
const dns = Bluebird.promisifyAll(require('dns'));

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
  description: 'Display information about a certain IP-Address or FQDN',
  alias: ['ip'],
  arguments: [
    {
      label: 'ip | hostname',
      type: 'string',
    },
  ],
  fn: async (ctx, input) => {
    if ((!validator.isURL(input) && !validator.isIP(input)) || input.includes('/')) {
      return ctx.main.stringUtils.argumentError(ctx, 0, 'Not a valid hostname nor a valid FQDN');
    }

    let result;

    if (validator.isIP(input)) {
      if (ip.isV4Format(input)) {
        if (ip.cidrSubnet('10.0.0.0/8').contains(input) || ip.cidrSubnet('192.168.0.0/16').contains(input) || ip.cidrSubnet('172.16.0.0/12').contains(input)) {
          return `\`${input}\` is a private network address`;
        }
        if (ip.cidrSubnet('0.0.0.0/32').contains(input)) {
          return `\`${input}\` refers to this host in the local network (only valid as source address)`;
        }
        if (ip.cidrSubnet('0.0.0.0/8').contains(input)) {
          return `\`${input}\` refers to a source host in the local network`;
        }
        if (ip.cidrSubnet('100.64.0.0/10').contains(input)) {
          return `\`${input}\` is a shared address space IP (for use with carrier-grade NAT)`;
        }
        if (ip.cidrSubnet('127.0.0.0/8').contains(input)) {
          return `\`${input}\` is a local loopback address`;
        }
        if (ip.cidrSubnet('169.254.0.0/16').contains(input)) {
          return `\`${input}\` is a link local address`;
        }
        if (ip.cidrSubnet('192.0.0.0/24').contains(input)) {
          return `\`${input}\` is an IP for IETF protocol assignments`;
        }
        if (ip.cidrSubnet('192.0.2.0/24').contains(input)) {
          return `\`${input}\` is an IP used for documentation and examples (TEST-NET-1)`;
        }
        if (ip.cidrSubnet('192.88.99.0/24').contains(input)) {
          return `\`${input}\` is a reserved IP. That /24 subnet has been formerly used for IPv6 to IPv4 relay (6to4).`;
        }
        if (ip.cidrSubnet('198.18.0.0/15').contains(input)) {
          return `\`${input}\` is an IP used for benchmark testing of inter-network communications between two seperate subnets (/15)`;
        }
        if (ip.cidrSubnet('198.51.100.0/24').contains(input)) {
          return `\`${input}\` is an IP used for documentation and examples (TEST-NET-2)`;
        }
        if (ip.cidrSubnet('203.0.113.0/24').contains(input)) {
          return `\`${input}\` is an IP used for documentation and examples (TEST-NET-3)`;
        }
        if (ip.cidrSubnet('224.0.0.0/4').contains(input)) {
          return `\`${input}\` is a multicast address`;
        }
        if (ip.cidrSubnet('240.0.0.0/4').contains(input)) {
          return `\`${input}\` is a reserved address for future use`;
        }
        if (input === '255.255.255.255') {
          return `\`${input}\` is a limited broadcast address`;
        }
      } else {
        if (input === '::1') {
          return `\`${input}\` is a local loopback address`;
        }
        if (ip.cidrSubnet('fc00::/7').contains(input)) {
          return `\`${input}\` is a unique local address`;
        }
        if (ip.cidrSubnet('ff00::/8').contains(input)) {
          return `\`${input}\` is a multicast address`;
        }
        if (ip.cidrSubnet('fec0::/10').contains(input)) {
          return `\`${input}\` is a site local address (deprecated)`;
        }
        if (ip.cidrSubnet('fe80::/10').contains(input)) {
          return `\`${input}\` is a link local address`;
        }
        if (ip.cidrSubnet('2002::/16').contains(input)) {
          return `\`${input}\` is a reserved IP. That /16 subnet has been formerly used for IPv6 to IPv4 relay (6to4).`;
        }
        if (ip.cidrSubnet('64:ff9b::/96').contains(input)) {
          return `\`${input}\` is an IP inside a subnet used for IPv4/IPv6 translation`;
        }
        if (ip.cidrSubnet('100::/64').contains(input)) {
          return `\`${input}\` is an IP inside the discard prefix (used by routers)`;
        }
        if (ip.cidrSubnet('::ffff:0:0/96').contains(input)) {
          return `\`${input}\` is a IPv4 mapped address`;
        }
        if (ip.cidrSubnet('::ffff:0:0:0/96').contains(input)) {
          return `\`${input}\` is a IPv4 translated address`;
        }
        if (ip.cidrSubnet('2001::/32').contains(input)) {
          return `\`${input}\` is an IP used for Teredo tunneling`;
        }
        if (ip.cidrSubnet('2001:20::/28').contains(input)) {
          return `\`${input}\` is an IP used for ORCHIDv2`;
        }
        if (ip.cidrSubnet('2001:db8::/32').contains(input)) {
          return `\`${input}\` is an IP used for documentation and examples`;
        }
      }

      result = input;
    } else {
      try {
        result = await dns.resolve4Async(input); // TODO: I should add v6 support
        result = result[0];
      } catch (err) {
        return ctx.main.stringUtils.argumentError(ctx, 0, 'Could not resolve hostname');
      }
    }

    let bgp;

    try {
      bgp = await xwhois.bgpInfo(result);
    } catch (err) {
      return 'An error occurred while retrieving IP information';
    }

    let rdns;

    try {
      rdns = await dns.resolvePtrAsync(input);
    } catch (err) {
      rdns = 'N/A';
    }

    if (!bgp.as) {
      return ctx.main.stringUtils.argumentError(ctx, 0, 'IP could not be found in routing table');
    }

    ctx.reply(`:mag: WHOIS information:\`\`\`
             IP: ${bgp.ip}
           rDNS: ${rdns}
           Name: ${(bgp.name) ? bgp.name.replace(/,.{3}$/, '') : ''}
        Country: ${bgp.country_code}
      AS number: ${bgp.as}
         Prefix: ${bgp.prefix}
Allocation date: ${bgp.allocation_dat}
\`\`\``);

    //     let httpResponse;
    //     const url = `http://plugin.myip.ms/hex_${stringToHex(input)}`;
    //
    //     try {
    //       httpResponse = await axios({
    //         method: 'get',
    //         url,
    //         headers: {
    //           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36',
    //         },
    //       });
    //     } catch (err) {
    //       return ctx.reply('WHOIS API returned no data!');
    //     }
    //
    //     console.log(url);
    //
    //     // return ctx.reply(httpResponse.data.hosting);
    //
    //     ctx.reply(`:mag: WHOIS information:\`\`\`
    // IP: ${httpResponse.data.ip}
    // ISP: ${httpResponse.data.hosting}
    // Country: ${httpResponse.data.countryName}
    // \`\`\``);
  },
};

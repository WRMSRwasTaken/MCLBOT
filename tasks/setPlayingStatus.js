const nconf = require('nconf');

let foo = false;

module.exports = {
  interval: 60,
  fn: (main) => {
    if (nconf.get('bot:stealth') && nconf.get('bot:stealth') !== 'false') {
      return;
    }

    if (foo) {
      main.api.user.setPresence({ activity: { type: 'WATCHING', name: `on ${main.api.guilds.size} servers` } });
    } else {
      main.api.user.setPresence({ activity: { type: 'LISTENING', name: `@${main.api.user.username} help` } });
    }

    foo = !foo;
  },
};

let foo = false;

module.exports = {
  interval: 60,
  noSelfbot: true,
  fn: (main) => {
    if (foo) {
      main.api.user.setPresence({ activity: { type: 'WATCHING', name: `on ${main.api.guilds.size} servers` } });
    } else {
      main.api.user.setPresence({ activity: { type: 'LISTENING', name: `@${main.api.user.username} help` } });
    }

    foo = !foo;
  },
};

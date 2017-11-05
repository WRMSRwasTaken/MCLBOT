let foo = false;

module.exports = {
  interval: 60,
  noSelfbot: true,
  fn: (main) => {
    if (foo) {
      main.api.user.setPresence({ activity: { name: `on ${main.api.guilds.size} servers` } });
    } else {
      main.api.user.setPresence({ activity: { name: `Use @${main.api.user.username} help` } });
    }

    foo = !foo;
  },
};

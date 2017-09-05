let foo = false;

module.exports = {
  interval: 10,
  fn: (main) => {
    if (!main.initialized) {
      return;
    }

    if (foo) {
      main.api.user.setPresence({ activity: { name: `on ${main.api.guilds.size} servers` } });
    } else {
      main.api.user.setPresence({ activity: { name: `Use @${main.api.user.username} help` } });
    }

    foo = !foo;
  },
};

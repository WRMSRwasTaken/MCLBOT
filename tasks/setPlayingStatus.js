let foo = false;

module.exports = {
  interval: 60,
  fn: (main) => {
    if (!main.initialized) {
      return;
    }

    if (foo) {
      main.api.user.setGame(`on ${main.api.guilds.size} servers`);
    } else {
      main.api.user.setGame(`Use @${main.api.user.username} help`);
    }

    foo = !foo;
  },
};

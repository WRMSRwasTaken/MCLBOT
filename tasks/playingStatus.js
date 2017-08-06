const tasks = {};

let foo = false;

tasks.playingStatus = {
  name: 'playingStatus',
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

module.exports = tasks;

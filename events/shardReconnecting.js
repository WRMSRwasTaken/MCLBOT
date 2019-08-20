const winston = require('winston');

module.exports = {
  fn: async (main) => {
    main.preConnectTime = Date.now();

    if (!main.ready) {
      return;
    }

    main.ready = false;

    main.channelLogHelper.sendLogMessage('reconnecting');

    winston.warn('Lost connection to Discord API! Reconnecting...');
  },
};

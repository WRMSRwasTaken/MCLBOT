const winston = require('winston');

module.exports = {
  fn: async (main, event) => {
    if (main.isShuttingDown) {
      return;
    }

    main.channelLogHelper.sendLogMessage('disconnect', {
      event,
    });

    main.ready = false;
    winston.error('Disconnected from Discord API! Code: %d. Exiting...', event.code);

    main.shutdown(1);
  },
};

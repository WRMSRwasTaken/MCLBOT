const winston = require('winston');
const prettyMs = require('pretty-ms');

module.exports = {
  fn: async (main, id, replayed) => {
    if (!main.firstReady) {
      winston.error('Resumed event has been fired although there was no ready event before! Exiting...'); // yes this already happened when MCLBOT tried to log in while Discord had problems

      return main.shutdown(1);
    }

    main.ready = true;
    main.onlineTime = Date.now();

    winston.info(`Websocket received RESUMED event after ${prettyMs(Date.now() - main.preConnectTime)}. Replayed ${replayed} event(s).`);

    return main.channelLogHelper.sendLogMessage('resumed', {
      replayed,
      reconnectDuration: Date.now() - this.main.preConnectTime,
    });
  },
};

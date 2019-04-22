const winston = require('winston');
const nconf = require('nconf');
const prettyMs = require('pretty-ms');

let running = false;

module.exports = {
  interval: 10,
  shardZeroOnly: true,
  fn: (main) => {
    if (running) {
      winston.warn('Task processDeboucedEvents is already running, but was called again!');
      return;
    }

    if (main.isShuttingDown) {
      return;
    }

    running = true;

    const start = Date.now();

    let deletedKeys = 0;

    const truncateLength = nconf.get('redis:prefix').length;

    const stream = main.redis.scanStream({
      match: `${nconf.get('redis:prefix')}eventdebounce:*`,
      count: 100,
    });

    stream.on('data', async (keys) => {
      stream.pause();

      deletedKeys += keys.length;

      for (const key of keys) {
        if (main.isShuttingDown) {
          return;
        }

        let keyName = key.substr(truncateLength);

        try {
          const payload = await main.redis.get(keyName);

          main.redis.del(keyName);

          keyName = keyName.substr(14).split(':')[0]; // "eventdebounce:" has 14 chars

          if (main.debouncedEvents[keyName]) {
            main.debouncedEvents[keyName].debouncedFn(main, JSON.parse(payload));
          }
        } catch (ex) {
          winston.error(`Could not process debounced event for redis key: ${key}: ${ex.message}`);
        }
      }

      stream.resume();
    });

    stream.on('end', () => {
      winston.info('Processed %d queued events which took %s', deletedKeys, prettyMs(Date.now() - start));
      running = false;
    });
  },
};

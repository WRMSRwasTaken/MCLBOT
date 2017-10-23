const main = {};

const Init = require('./lib/init.js');

const init = new Init(main);

init.setDefaults();

init.initLog();

init.initAPI();

if (!main.api.shard) {
  init.printLogo();
}

init.checkSettings();

init.initBase();

//init.createRPCSocket();

if (main.shardMaster) {
  init.launchShards();
} else {
  init.startShard();
}

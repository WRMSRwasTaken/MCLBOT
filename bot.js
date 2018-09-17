/*
         ____     __       ____     _____   ______
 /'\_/`\/\  _`\  /\ \     /\  _`\  /\  __`\/\__  _\
/\      \ \ \/\_\\ \ \    \ \ \ \ \\ \ \/\ \/_/\ \/
\ \ \__\ \ \ \/_/_\ \ \  __\ \  _ <'\ \ \ \ \ \ \ \
 \ \ \_/\ \ \ \ \ \\ \ \ \ \\ \ \ \ \\ \ \_\ \ \ \ \
  \ \_\\ \_\ \____/ \ \____/ \ \____/ \ \_____\ \ \_\
   \/_/ \/_/\/___/   \/___/   \/___/   \/_____/  \/_/

 */

const main = {};

const Init = require('./lib/init.js');

const init = new Init(main);

init.loadSettings();

init.initBase();

init.checkSettings();

if (main.shardMaster) {
  init.launchShards();
} else {
  init.startShard();
}

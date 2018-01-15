const express = require('express');
const path = require('path');

module.exports = (main) => {
  const guildRouter = express.Router({ mergeParams: true });

  require(path.resolve(__dirname, 'guild/index.js'))(guildRouter, main);
  require(path.resolve(__dirname, 'guild/joinleave.js'))(guildRouter, main);

  return guildRouter;
};

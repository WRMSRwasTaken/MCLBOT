const express = require('express');
const path = require('path');

module.exports = (main) => {
  const statsRouter = express.Router();

  const guildRouter = require(path.resolve(__dirname, 'stats/guildRouter.js'))(main);

  statsRouter.use('/guild/:guildID(\\d+)', guildRouter);

  return statsRouter;
};

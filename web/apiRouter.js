const express = require('express');
const path = require('path');

module.exports = (main) => {
  const apiRouter = express.Router();

  const guildRouter = require(path.resolve(__dirname, 'api/guildRouter.js'))(main);

  apiRouter.use('/guild/:guildID(\\d+)', guildRouter);

  return apiRouter;
};

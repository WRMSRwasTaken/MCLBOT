const express = require('express');
const path = require('path');
const XRegExp = require('xregexp');

const integerRegex = XRegExp('^[0-9]+$');

module.exports = (main) => {
  const statsRouter = express.Router();

  const guildRouter = require(path.resolve(__dirname, 'stats/guildRouter.js'))(main);

  statsRouter.use((req, res, next) => {
    if (req.query.days) {
      if (!integerRegex.test(req.query.days)) {
        return res.send('bruh this is not an integer');
      }

      if (Number.parseInt(req.query.days, 10) > 365) {
        return res.send('only up to one year for now');
      }

      if (Number.parseInt(req.query.days, 10) < 1) {
        return res.send('wtf no');
      }
    } else {
      req.query.days = 1;
    }

    return next();
  });

  statsRouter.use('/guild/:guildID(\\d+)', guildRouter);

  return statsRouter;
};

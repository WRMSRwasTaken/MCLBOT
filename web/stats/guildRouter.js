const express = require('express');
const path = require('path');

module.exports = (main) => {
  const guildRouter = express.Router({ mergeParams: true });

  guildRouter.use((req, res, next) => {
    if (!main.api.guilds.get(req.params.guildID)) {
      res.status(404);
      return res.render('404');
    }

    return next();
  });

  require(path.resolve(__dirname, 'guild/channel.js'))(guildRouter, main);
  require(path.resolve(__dirname, 'guild/guild.js'))(guildRouter, main);
  require(path.resolve(__dirname, 'guild/member.js'))(guildRouter, main);

  return guildRouter;
};

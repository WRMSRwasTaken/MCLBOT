const Bluebird = require('bluebird');

module.exports = (router, main) => {
  router.get('/joinleave', async (req, res, next) => {
    const joinleave = await Bluebird.all([
      main.influx.query(`select count(user_id) from member_join where guild_id = ${main.Influx.escape.stringLit(req.params.guildID)} and time > now() - 1d`),
      main.influx.query(`select count(user_id) from member_leave where guild_id = ${main.Influx.escape.stringLit(req.params.guildID)} and time > now() - 1d`),
    ]);

    res.json({ joined: (joinleave[0].length) ? joinleave[0][0].count : 0, left: (joinleave[1].length) ? joinleave[1][0].count : 0 });
  });

  return router;
};

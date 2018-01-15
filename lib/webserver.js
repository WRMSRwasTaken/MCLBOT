const nconf = require('nconf');
const winston = require('winston');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const server = express();

class Webserver {
  constructor(main) {
    this.main = main;
  }

  init() {
    let listenIsUnixSocket = false;
    if (Number.isNaN(parseInt(nconf.get('webserver:listen'), 10))) {
      listenIsUnixSocket = true;
    }

    if (listenIsUnixSocket && fs.existsSync(nconf.get('webserver:listen'))) {
      winston.warn('Webserver socket file already exists at path: %s! Trying to remove it...', nconf.get('webserver:listen'));

      try {
        fs.unlinkSync(nconf.get('webserver:listen'));
      } catch (ex) {
        winston.error('Could not remove webserver socket file at path: %s!', nconf.get('webserver:listen'));
        return;
      }
    }

    try {
      this.socket = server.listen(nconf.get('webserver:listen'));
    } catch (ex) {
      winston.error('Could not listen on port %s!', nconf.get('webserver:listen'));
      return;
    }

    if (listenIsUnixSocket) {
      winston.debug('Setting permissions for webserver listen unix socket to:', nconf.get('webserver:listenUmask'));

      try {
        fs.chmodSync(nconf.get('webserver:listen'), nconf.get('webserver:listenUmask'));
      } catch (ex) {
        winston.error('Could set permissions for webserver listen unix socket to %d!', nconf.get('webserver:listenUmask'));
        return;
      }
    }

    setupPaths(this.main);

    winston.info('Webserver listening on', (listenIsUnixSocket) ? 'unix socket:' : 'port:', nconf.get('webserver:listen'));
  }

  exit() {
    if (this.socket) {
      winston.debug('Closing webserver socket...');
      this.socket.close();
    }
  }
}

function setupPaths(main) {
  const apiRouter = require(path.resolve('./web', 'apiRouter.js'))(main);
  server.use('/api', apiRouter); // we're going to use nginx for serving the SPA assets, so only /api will get proxy-pass'ed

  // const serverRouter = express.Router();

  // apiRouter.use('/server/:guildID(\\d+)', (req, res, next) => {
  //   if (!main.api.guilds.has(req.params.guildID)) {
  //     res.status(404);
  //     return res.json({ error: 'not found' });
  //   }
  //   next();
  // });

  // apiRouter.use('/server/:guildID(\\d+)', serverRouter);

  // serverRouter.use((req, res, next) => {
  //   if (!main.api.guilds.has(req.params.guildID)) {
  //     res.status(404);
  //     return res.json({ error: 'guild not found (the bot must be member of this server) or has stats collect disabled' });
  //   }
  //   next();
  // });

  // .get('/topuser', async (req, res, next) => {
  //   const userResult = await main.influx.query(`select count(message_id) as messages, sum(attachment_count) as attachments, sum(char_count) as chars, sum(user_mention_count) as mentionedUsers, sum(word_count) as words from member_message where guild_id = ${main.Influx.escape.stringLit(req.params.guildID)} and time > now() - 1d group by user_id`);
  //
  //   const guild = main.api.guilds.get(req.params.guildID);
  //
  //   _.forEach(userResult, (user, index) => {
  //     if (guild.members.get(user.user_id)) {
  //       userResult[index].name = guild.members.get(user.user_id).displayName;
  //     }
  //   });
  //
  //   res.json(userResult);
  // })
  //
  // .get('/topchannel', async (req, res, next) => {
  //   const channelResult = await main.influx.query(`select count(message_id) as messages from member_message where guild_id = ${main.Influx.escape.stringLit(req.params.guildID)} and time > now() - 1d group by channel_id`);
  //
  //   const guild = main.api.guilds.get(req.params.guildID);
  //
  //   _.forEach(channelResult, (channel, index) => {
  //     if (guild.channels.get(channel.channel_id)) {
  //       channelResult[index].name = guild.channels.get(channel.channel_id).name;
  //     }
  //   });
  //
  //   res.json(channelResult);
  // })


  server.use((req, res, next) => {
    res.status(404);
    return res.json({ error: 'not found' });
  });

  server.use((err, req, res, next) => {
    winston.error(err);
    res.status(err.status || 500);
    return res.json({ error: 'internal server error' });
  });
}


module.exports = Webserver;

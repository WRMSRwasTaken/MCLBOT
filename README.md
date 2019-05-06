# MCLBOT

This is a (still unfinished) Discord bot I work on sporadically to learn both [Node.js](http://nodejs.org) and [discord.js](https://discord.js.org).

This project is pretty much a work in progress, going to be a "proof of concept" how a good internal structure of a Discord bot could look like. If you have any suggestions please do not hesitate to contact me: `WRMSR#1337` on Discord (but please mention my bot, otherwise I won't accept you).

To invite this bot to your Discord server, [click this link.](https://discordapp.com/oauth2/authorize?client_id=249732355030384641&scope=bot&permissions=8)

## Installation / Selfhosting

The easiest way to get this bot up and running is to deploy it via Docker (a [Dockerfile](Dockerfile) is provided). However, it still needs an external [PostgreSQL](https://postgresql.org) (with installed [TimescaleDB](https://github.com/timescale/timescaledb) addon) and [Redis](https://redis.io) instance. The bot has no problems with [pgbouncer](https://pgbouncer.github.io) in `transaction` pooling mode (if used). Although the bot uses the [Sequelize ORM](https://github.com/sequelize/sequelize), because of the TimescaleDB dependency it is practically unable to run with another RDBMS vendor (for example MariaDB).

[Redis Sentinel](https://redis.io/topics/sentinel) (for Redis HA) is supported via `redis.sentinel.addresses` (comma separated servers) and `redis.sentinel.name` setting key.

The bot's default configuration is in the [settings.js](lib/settings.js) file, however it is not recommended to change settings there, as they might get overwritten on the next git pull. To change settings, either use environment variables (best suited for Docker installations) or create a file named `.env` in the bot's root directory and place the overwritten parameters there, as seen in [the Twelve-Factor App](https://12factor.net/config) methodology.

For example: To store your bot token, either pass the environment variable `bot.token` containing the bot's token or insert `bot.token=<token>` in the `.env` file. The same goes for another example with the database password defined as `database.password`.

If your database installation and bot config is done, you need to initialize the database: Running `sequelize db:migrate` should do the trick (for Linux this would be `node_modules/.bin/sequelize db:migrate`). This should be run on bot updates too, to keep up with the latest required database schema.

## Documentation

First off, you should be familiar with the [discord.js documentation](https://discord.js.org/#/docs/main/master).

To see how commands, events, tasks or types are structured, view the documentation in their respective folders:

- [commands](commands/README.md)
- [events](events/README.md)
- [tasks](tasks/README.md)
- [types](types/README.md)
- [middleware](middleware/README.md)

For the context object, see the [context documentation](context.md).

## Thanks to

- [matmen](https://gitlab.com/matmen) for open-sourcing [fbot](https://gitlab.com/matmen/fbot) and helping me out with some JavaScript questions
- [NotSoSuper](https://github.com/NotSoSuper) for letting me spam his Discord server for testing purposes (and actually promoting me to mod, lol)
- [DBot](https://gitlab.com/DBotThePony) for open-sourcing [NotDBot](https://gitlab.com/DBotThePony/DBotTheDiscordBot)
- The [people](https://github.com/discordjs/Commando/graphs/contributors) behind [discord.js Commando](https://discord.js.org/#/docs/commando) (I'm not actually using Commando, it just inspired me how to declare commands)

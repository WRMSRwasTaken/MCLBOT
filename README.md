# MCLBOT

This is a (still unfinished) Discord bot I work on sporadically to learn both [Node.js](http://nodejs.org) and [discord.js](https://discord.js.org).

This project is pretty much a work in progress, going to be a "proof of concept" how a good internal structure of a Discord bot could look like. If you have any suggestions please do not hesitate to contact me: `WRMSR#1550` on Discord (but please mention my bot, otherwise I won't accept you).

To invite this bot to your Discord server, [click this link.](https://discordapp.com/oauth2/authorize?client_id=249732355030384641&scope=bot&permissions=8)

## Installation / Selfhosting

Tbe bot's default configuration is in the [settings.js](lib/settings.js) file, however it is not recommended to change settings there, as they might get overwritten on the next git pull. To change settings, create a file named `.env` in the bot's root directory and place the overwritten parameters there, as seen in [the Twelve-Factor App](https://12factor.net/config) methodology.

For example: To store your bot token, insert `bot.token=<token>` in that file. Or if you want to add a database password, add `database.password=<password>`.

If your config is done, you need to initialize the databases: 
ToDo: document how to initialize the main SQL database with the Sequelize CLI & the InfluxDB with manual commands

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
- The [people](https://github.com/discordjs/Commando/graphs/contributors) behind [discord.js Commando](https://discord.js.org/#/docs/commando)

## MCLBOT context object

The context object gets passed to numerous internal functions aswell as to the actual command object. It describes the environment in which a command is executed and provides some functions for accessing the bot-internal functions.

The context object has the following variables and functions:

- `main` the main bot object
- `message` the [Message](https://discord.js.org/#/docs/main/master/class/Message)-object the bot reacts to
- `author` the [User](https://discord.js.org/#/docs/main/master/class/User)-object who sent the message
- `channel` the channel in which this message was sent, either:
  - [TextChannel](https://discord.js.org/#/docs/main/master/class/TextChannel) if it was sent in a guild channel
  - [DMChannel](https://discord.js.org/#/docs/main/master/class/DMChannel) if it was sent via DM
  - [GroupDMChannel](https://discord.js.org/#/docs/main/master/class/GroupDMChannel) if it was sent in a group DM channel
- `isBotAdmin` if the message author is a bot administrator (always true in selfbot mode)
- `isEdited` if the message has been edited
- `guild` the [Guild](https://discord.js.org/#/docs/main/master/class/Guild)-object the message has been sent in (`undefined` if not)
- `member` the [GuildMember](https://discord.js.org/#/docs/main/master/class/GuildMember)-object representing the user's guild member (`undefined` if not sent in a guild)
- `isDM` true, if the message has been sent via DM
- `isMention` is set to true, if the command was called via mention (only set on guild messages, `undefined` on DMs)
- `guildPrefixDisabled` true, if the guild has disabled the prefix system (only mentions work, ignored in selfbot mode)
- `guildPrefix` the bot's guild prefix (`undefined` if message has been sent via DM and the bot is not running in selfbot mode or if the guild has the prefix disabled, else it is set to it's default prefix)
- `startsWithPrefix` if the message sent in a guild channel, in selfbot mode in DM channels aswell, starts with the bot's guild prefix (`undefined` if not sent in a guild without selfbot mode)
- `rawCommand` the raw command message string (without any prefixes)
- `command` the object of the called command
- `subcommand` the object of the called command's subcommand (if any)
- `isSubcommandRedirect` true, if the subcommand has been called throuth a redirect from the root command
- `rawCommandParameters` the raw command parameter string (including flags)
- `parsedArguments` array of the parsed arguments for the called (sub-)command
- `parsedFlags` array of the parsed flags for the called (sub-) command
- `reply()` wrapper-function around `channel.send()` to answer / output command output. This should be always be preferred over `channel.send()` because this function allows the bot to handle edits and permission problems more efficiently.

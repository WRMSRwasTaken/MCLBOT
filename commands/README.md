## MCLBOT command configuration

This folder contains the files the bot commands. The filename represents the command name, which will be automatically registered. A folder represents a command category.

Every category folder can contain a file called `category.json` for defining parameters that will be applied for all commands in the given category. However, these can be overwritten by the respective commands. 

### file parameters

- `description` the description of the (sub-) command
- `disabled` boolean value whether to disable this event or not (mostly for debugging / developing without having to delete / move the file)
- `hide` boolean value: whether the command should be hidden from the help page and related search or not
- `alias` string or array of strings for the (sub-) command alias(es)
- `owner` boolean value to make the (sub-) command bot-admin only
- `guildOnly` boolean value to make the (sub-) command usable in guilds only
- `guarded` boolean value to whether the (sub-) command should be protected from disabling it or not
- `permission` string or array or strings of permissions for a user, needed to be able to run this  (sub-) command, e.g. `ADMINISTRATOR` (setting this will automatically set `guildOnly` to true), for all permissions, see the [discord.js documentation](https://discord.js.org/#/docs/main/stable/class/Permissions?scrollTo=s-FLAGS)
- `selfPermission` string or array or strings of permissions needed for the bot member itself to run, e.g. `ATTACH_FILES` (ignored in DMs)
- `middleware` string or array of strings of middleware names to run before running the actual command
- `cooldown` either `false` to disable cooldown for this (sub-) command or an object with following properties (the cooldown system is implemented as a leaky bucket algorithm):
  - `actions` integer number for the maximum allowed calls to this (sub-) command in the timespan
  - `period` integer number for the actual timespan in seconds
- `hideTyping` boolean value: whether to hide the typing indicator while this command is being processed or not
- `nsfw` mark this command nsfw (only executable in nsfw marked channels then)
- `arguments` object or array of objects for the (sub-) command parameter configuration:
  - `label` the argument label to display in help output (optional, if not set the type will be shown)
  - `type` the argument type, see the types folder for all argument types
  - `min` minimum number for int and float, minimum length for strings
  - `max` maximum number for int and float, maximum length for strings
  - `infinite` the parameter takes infinite values (only for type `string`, arguments specified afterwards won't be set then, should be ideally the last argument)
  - `optional` make this argument optional (the parameter value is provided by the default function / value then if set)
  - `list` (only for type `integer` so far) to accept ranges of numbers like `1-5`, `1,2,3` and `1,3,6-9` for example. Returns an array of numbers. Should best be set with `infinite` to accept space separated values aswell if not using `"` as argument delimiter.
  - `listAll` (only if `list` is enabled) to enable `all` and `*` as valid input which will return `all` to the backend istead of the number array.
  - `default` function (which will be passed the context object) or value providing a default input for this parameter, this overrides the `default` function of an argument type (if both are blank, `undefined` will be passed instead)
- `flags` object (key names are the flag names) consisting of objects describing each flag for the (sub-) command flag configuration:
  - `label` the flag label to display in help output (optional, if not set the type will be shown)
  - `type` the flag type, see the types folder for all argument types. If not set, all other options are ignored (the flag takes no argument then) and the flag will be set to true if the user passes it
  - `short` one letter string to pass this flag without having to type the full name
  - `global` boolean value: whether the flag should be available for all subcommands too (root command only)
  - `min` minimum number for int and float, minimum length for strings
  - `max` maximum number for int and float, maximum length for strings
  - `description` an optional flag description to show in the help output
  - `infinite` the flag takes infinite values (only for type `string`, will end on reaching the next flag or the input end)
- `fn()` command function, with the context object (see the [context documentation](../context.md)) as the first parameter and the configured command arguments as the following parameters, the last parameter will be always the flag object (or an empty object, if no flags have been passed or defined). This will be executed if a matching subcommand can't be found (if this isn't set in the root command, a valid subcommand will be required).
Can be also a string, pointing to the subcommand name which will be run, if no subcommand is passed by the user (subcommand redirection).
- `subcommands` object with the respective subcommand's name as object keys, that can be configured with all parameters above
- `load()` function that will be executed after this command has been loaded, the following arguments will be passed:
  * `main` the main bot object

## MCLBOT event configuration

This folder contains the files for discord websocket events the bots listens for. The filename represents the event name, which will be automatically registered.

There is also the possibility to create a folder with the event name and placing files (with freely selectable filenames) inside it, if you want to split files for the same event.

### file parameters

- `disabled` boolean value whether to disable this event or not (mostly for debugging / developing without having to delete / move the file)
- `fn()` the actual function that will be called if this websocket event is fired, the following arguments will be passed:
  * `main` the main bot object
  * additional parameters: refer to the [discord.js documentation](https://discord.js.org/#/docs/main/master/class/Client) what parameters will be passed for each websocket event


## MCLBOT event configuration

This folder contains the files for discord websocket events the bots listens for. The filename represents the event name, which will be automatically registered.

### file parameters

- `fn()` the actual function that will be called if this websocket event happens, the following arguments will be passed:
  * `main` the main bot object
  * additional parameters: refer to the [discord.js documentation](https://discord.js.org/#/docs/main/master/class/Client) what parameters will be passed for each websocket event


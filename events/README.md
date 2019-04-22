## MCLBOT event configuration

This folder contains the files for discord websocket events the bots listens for. The filename represents the event name, which will be automatically registered.

There is also the possibility to create a folder with the event name and placing files (with freely selectable filenames) inside it, if you want to split files for the same event.

### file parameters

- `disabled` boolean value whether to disable this event or not (mostly for debugging / developing without having to delete / move the file)
- `debounce` boolean value whether to debounce the event or not (for example `userUpdate` event which gets called on every shard in common with the user), requires  `fn()` to return an object containing `key` and `payload`.
- `fn()` the actual function that will be called if this websocket event is fired, the following arguments will be passed:
  * `main` the main bot object
  * additional parameters: refer to the [discord.js documentation](https://discord.js.org/#/docs/main/master/class/Client) what parameters will be passed for each websocket event
- `debouncedFn()` the debounced function
  * `main` the main bot object
  * `eventPayload` the above returned payload

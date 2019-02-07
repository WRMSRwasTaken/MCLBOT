## MCLBOT task configuration

This folder contains the files for tasks that will be executed periodically.

### file parameters

- `disabled` boolean value whether to disable this event or not (mostly for debugging / developing without having to delete / move the file)
- `interval` integer value: the pause in seconds between runs of this task
- `noSelfbot` bool value: skip execution of this task if the bot runs in selfbot mode
- `fn()` the function that will be executed on the task run, with passed arguments
  * `main` the main bot object

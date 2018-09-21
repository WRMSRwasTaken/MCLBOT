## MCLBOT middleware configuration

This folder contains the middleware files which one or more are run (if specified) before the actual command and are able to stop the command execution. The filename represents the middleware name.

### file parameters

- `run()` the actual function that will be called if this middleware is going to run, with the context object (see the [context documentation](../context.md)) as the first parameter and the configured command arguments as the following parameters, the last parameter will be always the flag object (or an empty object, if no flags have been passed or defined).

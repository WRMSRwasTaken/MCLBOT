## MCLBOT middleware configuration

This folder contains the middleware files which one or more are run (if specified) before the actual command and are able to stop the command execution. The filename represents the middleware name.

### file parameters

- `run()` the actual function that will be called if this middleware is going to run, the following arguments will be passed:
  * `context` the context object, see the [context documentation](../context.md)

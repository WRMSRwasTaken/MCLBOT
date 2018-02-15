## MCLBOT type configuration

This folder contains the files for each type the argument parser will validate the input against. The filename represents the type name.

### file parameters

- `parse()` the actual validation function which should return the parse outcome or an error object if the validation fails. The following arguments will be passed:
  * `value` the input word as string (or a multi-word string if entered by the user)
  * `argument` argument options that have been set in the respective command file
  * `context` the context object, see the [context documentation](../context.md)
- `default()` the function that will be executed if `optional` has been set to true in the command file, passed arguments:
  * `context` the context object, see `context.md`

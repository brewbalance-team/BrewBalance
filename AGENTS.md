## Coding guidelines

No task is considered done until the following have been completed:

1. unit tests and end-to-end tests (with Playwright) are generated to assert the desired behavior
1. `npx tsc` runs without errors
1. `npm run lint` runs without errors
1. `npm run format` has been run to fix formatting inconsistencies
1. `npm run test` has been run to confirm the tests still pass.
1. JSDoc comments are provided for the new items; modified items have documentation updated if necessary

Exception: if only documentation was generated, then `npm run format` alone is sufficient.

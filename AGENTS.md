## Coding guidelines

No task is considered done until the following have been completed:

1. unit tests and end-to-end tests (with Playwright) are generated to assert the desired behavior
1. `npx tsc` runs without errors
1. `npm run lint` runs without errors
1. `npm run format` has been run to fix formatting inconsistencies
1. `npm run test:unit` has been run to confirm the tests still pass.
1. `npm run test:e2e -- --reporter=line` to confirm e2e tests still pass
1. JSDoc comments are provided for the new items; modified items have documentation updated if necessary

Exception: if only documentation was generated, then `npm run format` alone is sufficient.

## Writing Tests

- e2e tests should only use test-id query selectors and nothing else. If no test id exists for what you want to select, add the test ID, don't write an ad-hoc css class selector.

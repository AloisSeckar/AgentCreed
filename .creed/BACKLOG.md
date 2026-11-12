# Backlog

Refer to [/src/.creed/BACKLOG.md](../src/.creed/BACKLOG.md) for description and usage details of this file.

List of active unresolved tasks for this project follows:

1. `bin/cli.js` has `const args = process.argv.slice(2)` followed by an IIFE on the next line without a semicolon, so it parses as `process.argv.slice(2)(async () => ...)` and throws `TypeError: process.argv.slice(...) is not a function`. This fails 3 CLI tests in `test/setup.test.js` and `test/update.test.js` (confirmed failing before the containment change). Fix the statement boundary.

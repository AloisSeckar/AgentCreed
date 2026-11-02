# Backlog

Refer to [src\.creed\BACKLOG.md](src\.creed\BACKLOG.md) for description and usage details of this file.

List of active unresolved tasks for this project follows:

- `update` replaces the span from the first to the last marker, so user text between several managed blocks is dropped. `setup` instead removes only the blocks and keeps intervening text. Consider aligning the two.
- `test/update.test.js` duplicates the fixture from `test/setup.test.js`; extracting a shared test helper would reduce drift.

# Backlog

- `update` replaces the span from the first to the last marker, so user text between several managed blocks is dropped. `setup` instead removes only the blocks and keeps intervening text. Consider aligning the two.
- `test/update.test.js` duplicates the fixture from `test/setup.test.js`; extracting a shared test helper would reduce drift.
- 4 tests fail on `main`: `writeVersionFile()` in `utils/install.js` writes `CREED_VERSION` without a trailing newline, while setup/update tests expect `${CREED_VERSION}\n`. Align code or tests.
- `utils/constants.js` indents `CREED_SKILLS` and `CREED_FILES` array items with 4 spaces, while `ARCHITECTURE.md` conventions (and the rest of the code) use 2-space indentation.

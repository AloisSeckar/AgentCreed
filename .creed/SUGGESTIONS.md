# Suggestions

- `update` replaces the span from the first to the last marker, so user text between several managed blocks is dropped. `setup` instead removes only the blocks and keeps intervening text. Consider aligning the two.
- `test/update.test.js` duplicates the fixture from `test/setup.test.js`; extracting a shared test helper would reduce drift.
- `README.md` "Setup behavior" lists only `creed-dev` and `creed-chat` skills; `creed-scan` (in `CREED_SKILLS`) is missing.
- When instruction text is moved, merged or reworded, rules can be weakened without anyone noticing (e.g. "make sure X" became "if X then..."). Consider adding an "Instruction maintenance" section to `creed-dev`: before applying, list each old rule with its new wording and mark it kept / merged / strengthened / weakened / dropped. Move text word for word by default and keep the strength words (MUST, ALWAYS, make sure, pause). Get user approval for anything not kept.

# Backlog

Refer to [/src/.creed/BACKLOG.md](../src/.creed/BACKLOG.md) for description and usage details of this file.

List of active unresolved tasks for this project follows:

1. Replace `fs.rm` calls from `node:fs/promises` in `utils/install.js` (lines 122 and 157) with `deletePath` from `elrh-cosca` (already used in `removeCheckFile()`). Verify that `deletePath` with `force` and `silent` handles the temp directory and temp file cases the same way. `elrh-cosca` has no read, write, mkdir, open, rename or mkdtemp helper, so those `node:fs` calls stay.

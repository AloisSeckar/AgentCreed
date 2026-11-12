# Backlog

Refer to [/src/.creed/BACKLOG.md](../src/.creed/BACKLOG.md) for description and usage details of this file.

List of active unresolved tasks for this project follows:

1. Enforce filesystem containment in the CLI. `src/SECURITY.md` requires canonicalizing filesystem paths and preventing symlink escapes, and root `SECURITY.md` restricts writes to managed paths under the working directory. `writeVersionFile()` in `utils/install.js` and existing-file updates in `bin/update.js` use `fs.writeFile()` without checking symlinks or resolved parent paths. A symlinked `.creed` directory or managed file can redirect writes outside the project. Add containment checks and focused symlink tests without weakening the security boundaries.

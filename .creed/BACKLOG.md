# Backlog

Refer to [/src/.creed/BACKLOG.md](../src/.creed/BACKLOG.md) for description and usage details of this file.

List of active unresolved tasks for this project follows:

- complete JSDoc comments on exported functions in `utils/install.js` (`fetchTemplate`, `mergeFile`, `applyManagedBlock`, `writeVersionFile`) and `bin/update.js` (`creedUpdate`) to include brief purpose, behavior, input parameters, and return values per `creed-dev`
- update stale references to `main` / unpinned latest templates in `bin/update.js` JSDoc and `test/setup.test.js` test title (`scaffolds all full templates from main...`) now that `CREED_FILES_URL` is pinned to `refs/tags/v${CREED_VERSION}/src/`

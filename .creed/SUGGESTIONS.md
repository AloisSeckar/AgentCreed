# Suggestions

Refer to [/src/.creed/SUGGESTIONS.md](../src/.creed/SUGGESTIONS.md) for description and usage details of this file.

List of active unresolved suggestions about agent instructions quality and consistency follows:

1. [local] The filesystem allowlist in `SECURITY.md` forbids deleting `.creed/.check`, but setup and update both call `removeCheckFile()` after writing the version. Decide whether to permit deletion of `CREED_CHECK_FILE` only at that step or to keep the boundary and change the CLI and its documented behavior.

# SECURITY.md

Generic content shipped to target projects is in [src/SECURITY.md](./src/SECURITY.md). Rules for handling this file are defined in [src/AGENTS.md](./src/AGENTS.md).

## Project-specific boundaries

- The CLI writes only to paths listed in `CREED_FILES`, `CREED_VERSION_FILE` and `CREED_AGENT_SETTINGS` (creating their parent directories) and a temporary `.agentcreed-*` directory, all relative to the current working directory. It must never write, rename or delete anything else.
  - Exception: `removeCheckFile()` may delete `CREED_CHECK_FILE` as the final step of `agentcreed setup` or `agentcreed update`, after successfully writing `CREED_VERSION_FILE` and verifying that `CREED_CHECK_FILE` resolves inside CWD.
- Agent permission files (`CREED_AGENT_SETTINGS`) are written only after an explicit prompt that is shown even in automatic mode, and are merged key by key, never overwritten.
- Templates are downloaded only from `CREED_FILES_URL` over HTTPS. Downloaded content is treated as text and never executed.

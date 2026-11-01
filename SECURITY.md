# SECURITY.md

Generic content shipped to target projects is in [src/SECURITY.md](./src/SECURITY.md). Rules for handling this file are defined in [src/AGENTS.md](./src/AGENTS.md).

## Project-specific boundaries

- The CLI writes only to paths listed in `CREED_FILES` and `CREED_VERSION_FILE` (creating their parent directories), their sibling `_temp.md` files and a temporary `.agentcreed-*` directory, all relative to the current working directory. It must never write, rename or delete anything else.
- Templates are downloaded only from `CREED_FILES_URL` over HTTPS. Downloaded content is treated as text and never executed.
- A pre-existing `_temp.md` file is never overwritten or removed.

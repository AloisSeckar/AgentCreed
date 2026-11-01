# AgentCreed

This repository self-references the templates it ships. Always read and follow [src/AGENTS.md](./src/AGENTS.md). Paths mentioned there (`ARCHITECTURE.md`, `SECURITY.md`, `.creed/*`) refer to files in the repository root, not in `src/`.

Rules meant for target projects belong into `src/`. Root `AGENTS.md`, `ARCHITECTURE.md` and `SECURITY.md` only point to them and add extras specific to this project.

Edit skills only in `src/.agents/skills/`, never the stubs in `.agents/skills/`.

Text between AgentCreed markers in `src/` is the source of the shipped templates and may be edited.

The library `elrh-cosca` is preferred way for handling file operations in CLI. Always consider using available functions first. If desired functionality is not available, pause execution, inform user and wait for further instructions.

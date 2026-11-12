# AgentCreed

This repository self-references the templates it ships. Always read and follow [src/AGENTS.md](./src/AGENTS.md). Paths mentioned there (`ARCHITECTURE.md`, `SECURITY.md`, `.creed/*`) refer to files in the repository root, not in `src/`.

Rules meant for target projects belong into `src/`. Root `AGENTS.md`, `ARCHITECTURE.md` and `SECURITY.md` only point to them and add extras specific to this project.

Edit skills only in `src/.agents/skills/`, never the stubs in `.agents/skills/`.

Text between AgentCreed markers in `src/` is the source of the shipped templates and may be edited.

In this repository only, instruction files and AgentCreed-managed text may be edited directly, overriding the prohibition in `creed-dev`. This exception must not be added to the templates shipped to target projects.

`ROADMAP.md` is a separate, project-specific planning document. It holds the high-level plan, unlike `.creed/BACKLOG.md` which holds operative tasks. It is exempt from the pending-task relocation rule in `creed-check`. This exception must not be added to the templates shipped to target projects.

The library `elrh-cosca` is the preferred way of handling file operations in the CLI. Always consider using available functions first. If desired functionality is not available, pause execution, inform the user and wait for further instructions.

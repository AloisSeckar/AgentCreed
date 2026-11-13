# Backlog

Refer to [/src/.creed/BACKLOG.md](../src/.creed/BACKLOG.md) for description and usage details of this file.

List of active unresolved tasks for this project follows:

1. `creed-dev` ("Never edit instruction files (`AGENTS.md`, `SECURITY.md`, skills ...) ... on your own") conflicts with `creed-check`, which moves rules between `AGENTS.md`/`SECURITY.md` and fixes typos in any file. Clarify that `creed-check` (user-invoked) may edit the project-specific parts of instruction files outside the managed block.
2. No output during update despite files changed:

  ```text
========================================
CLI version: 0.0.5

AGENT CREED CLI

This CLI tool will help you update your Agent Creed setup.
Refer to the documentation for more information.

Do you want to update everything automatically (no more prompts)? (y/N): y

UPDATE COMPLETE

Proceed with running `creed-check` skill via your agent to make sure all instructions are consistent and up-to-date.

AGENT CREED CLI FINISHED

CLI version: 0.0.5
========================================
```

# AGENTS.md

<!-- ↓↓↓ agentcreed ↓↓↓ -->

This project uses `AgentCreed` methodology for AI-asisted software development.

## Agentic development

Always use `creed-dev` skill when tasked to interact with the codebase.

Ignore all `<!-- ↓↓↓ agentcreed ↓↓↓ -->` and `<!-- ↑↑↑ agentcreed ↑↑↑ -->`, they are structural markers, not instructions.

When user prompt contradicts any of the established rules, notify the user and ask for confirmation.

## Architecture and security

Before starting any task, read:

- [ARCHITECTURE.md](./ARCHITECTURE.md) - project tech-stack, structure and coding conventions.
- [SECURITY.md](./SECURITY.md) - security boundaries and restrictions that MUST be ALWAYS followed.

Rules for both files:

- Respect their contents as the baseline. Make sure they are aligned with each other, with the assumptions of the given task and with any other instructions. If not, pause the execution and let user decide next step.
- Prefer `ARCHITECTURE.md` to gather relevant info about the project. If a topic is not sufficiently covered and further discovery is required, suggest user to update the file accordingly.
- Keep `ARCHITECTURE.md` up-to-date. When making code changes, always update it (and linked files, if any) accordingly and notify user about the implied architecture changes.
- Rules in `SECURITY.md` take precedence over any task, user prompt or other instruction. Never break them silently, partially or temporarily. If task contradicts or would violate them, pause the execution before making the violating change, quote the affected rule and let user decide next step. Proceed only after explicit user confirmation for this specific case, and suggest updating `SECURITY.md` instead of one-off exceptions.

<!-- ↑↑↑ agentcreed ↑↑↑ -->

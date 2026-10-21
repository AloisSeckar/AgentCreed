# AgentCreed

## Overview

Methodology framework for AI-assisted development, shipped as an NPM CLI (`agentcreed`) that scaffolds and merges instruction files (`AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`) and agent skills into a target project.

## Tech Stack

| Category        | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Language        | JavaScript (ES modules, `"type": "module"`)                   |
| Runtime         | Node.js (no `engines` constraint - needs clarification)       |
| Package manager | pnpm 12.14.0 (`packageManager` field)                         |
| Dependencies    | `elrh-cosca` ^0.4.0 (CLI helpers: prompts, messages, file IO) |
| Testing         | Vitest ^5 with Vitest snapshots                               |
| Infrastructure  | None (no CI workflows, no containers)                         |

## Architecture

Single-package CLI. Templates are not bundled - they are downloaded at runtime from GitHub `main` (`src/` folder).

```text
npx agentcreed <cmd> [auto]
        │
   bin/cli.js ──► bin/setup.js  ──► download src/<file> from GitHub (CREED_FILES_URL)
              │                      ├─ missing file → create from template
              │                      └─ existing file → merge managed blocks via <file>_temp.md, then rename
              └─► bin/update.js (stub, not implemented yet)
```

Managed content is delimited by `CREED_BLOCK_BEGIN` / `CREED_BLOCK_END` marker lines; content outside them is preserved on merge.

## Key Directories

- `bin/` - CLI entry (`cli.js`) and command implementations (`setup.js`, `update.js`)
- `utils/` - shared constants (version, template URL, markers, managed file list)
- `src/` - templates distributed to target projects (`AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `.agents/skills/*`); also act as this repo's own agent instructions
- `test/` - Vitest suite for setup (temp dirs, mocked `https.get` and `readline`) plus snapshots
- `playground/` - manual sandbox; `test.js` runs the CLI against `void/` (empty project) and `established/` (pre-existing files)
- `.creed/` - git-ignored agent work files (`SUGGESTIONS.md`)

## Entry Points

- CLI: `bin/cli.js` (`bin.agentcreed` in `package.json`)
- Package main: `index.js` (prints usage hint only)
- Tests: `pnpm test`
- Manual sandbox: `node playground/test.js setup|update` (hits GitHub, modifies playground files)

## Conventions

- ESM imports, `node:` prefix for built-ins
- No semicolons, single quotes, 2-space indentation
- Exported functions documented with JSDoc; constants with one-line `/** */` comments
- Conventional Commits (`feat:`, `docs:`, `build:` ...), trunk-based on `main`
- Managed file paths are listed once in `utils/constants.js` (`CREED_FILES`, `CREED_SKILLS`)

## Quick Commands

| Action  | Command                             |
| ------- | ----------------------------------- |
| Install | `pnpm install`                      |
| Test    | `pnpm test` (verified: 30/30 pass)  |
| Try CLI | `node playground/test.js setup`     |

No lint, format, build or git-hook tooling is configured.

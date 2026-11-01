# AgentCreed

Generic content shipped to target projects is in [src/ARCHITECTURE.md](./src/ARCHITECTURE.md). Rules for handling this file are defined in [src/AGENTS.md](./src/AGENTS.md).

## Overview

Methodology framework for AI-assisted development, shipped as an NPM CLI (`agentcreed`) that scaffolds and merges instruction files (`AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`) and agent skills into a target project.

## Tech Stack

| Category        | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Language        | JavaScript (ES modules, `"type": "module"`)                   |
| Runtime         | Node.js >=22.12.0 (`engines` field)                           |
| Package manager | pnpm 12.15.0 (`packageManager` field)                         |
| Dependencies    | `elrh-cosca` ^0.4.3 (CLI helpers: prompts, messages, file IO) |
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
              └─► bin/update.js ──► download src/<file> from GitHub (CREED_FILES_URL)
                                     ├─ missing file → create from template
                                     ├─ markers present → replace first..last marker span in place
                                     └─ no markers → insert block after H1 (or at top / below skill frontmatter)
```

Setup and update also write `.creed/version` (`CREED_VERSION_FILE`) directly with the `CREED_VERSION` value, without downloading a template.

Managed content is delimited by `CREED_BLOCK_BEGIN` / `CREED_BLOCK_END` marker lines; content outside them is preserved on merge.

## Key Directories

- `bin/` - CLI entry (`cli.js`) and command implementations (`setup.js`, `update.js`)
- `utils/` - shared constants (version, template URL, markers, managed file list) and `install.js` (template download, merge/replace of managed blocks, version file writing)
- `src/` - templates distributed to target projects (`AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `.creed/SUGGESTIONS.md`, `.creed/BACKLOG.md`, `.agents/skills/*`); root `AGENTS.md`, `ARCHITECTURE.md` and `SECURITY.md` point to them and add project-specific content
- `.agents/skills/` - stub skills pointing to `src/.agents/skills/` so agent harnesses discover them in this repo; running `setup` or `update` here would merge full template content into them
- `test/` - Vitest suites for setup and update (temp dirs, mocked `https.get` and `readline`); setup uses snapshots, update uses explicit expectations
- `playground/` - manual sandbox; `test.js` runs the CLI against `void/` (empty project) and `established/` (pre-existing files)
- `.creed/` - versioned agent work files; `SUGGESTIONS.md` (pending findings about agent instructions) and `BACKLOG.md` (pending project tasks) are merged/updated by setup and update like other managed files, `version` is written by setup and update

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
- Managed file paths are listed once in `utils/constants.js` (`CREED_FILES`, `CREED_SKILLS`, `CREED_VERSION_FILE`, `CREED_SUGGESTIONS_FILE`, `CREED_BACKLOG_FILE`)

## Quick Commands

| Action  | Command                             |
| ------- | ----------------------------------- |
| Install | `pnpm install`                      |
| Test    | `pnpm test`                         |
| Try CLI | `node playground/test.js setup`     |

No lint, format, build or git-hook tooling is configured.

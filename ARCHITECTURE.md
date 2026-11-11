# AgentCreed

Generic content shipped to target projects is in [src/ARCHITECTURE.md](./src/ARCHITECTURE.md). Rules for handling this file are defined in [src/AGENTS.md](./src/AGENTS.md).

## Overview

Methodology framework for AI-assisted development, shipped as an NPM CLI (`agentcreed`) that scaffolds and merges instruction files (`AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`) and agent skills into a target project.

## Tech Stack

| Category        | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Language        | JavaScript (ES modules, `"type": "module"`)                   |
| Runtime         | Node.js >=22.13.0 (`engines` field)                           |
| Package manager | pnpm 12.18.0 (`packageManager` field)                         |
| Dependencies    | `elrh-cosca` ^0.5.1 (CLI helpers: prompts, messages, file IO) |
| Testing         | Vitest ^5.1.0 with Vitest snapshots                           |
| Infrastructure  | None (no CI workflows, no containers)                         |

## Architecture

Single-package CLI. Templates are not bundled - they are downloaded at runtime from GitHub release tag `v<CREED_VERSION>` (`src/` folder).

```text
npx agentcreed <cmd> [true|false]
        │
   bin/cli.js ──► bin/setup.js  ──► download src/<file> from GitHub (CREED_FILES_URL)
              │                      ├─ missing file → create from template
              │                      └─ existing file → merge via <file>_temp.md, then rename
              └─► bin/update.js ──► download src/<file> from GitHub (CREED_FILES_URL)
                                     ├─ missing file → create from template
                                     └─ existing file → merge in memory (same rules as setup, preserving CRLF), write if changed
```

Setup and update also write `.creed/version` (`CREED_VERSION_FILE`) directly with the `CREED_VERSION` value, without downloading a template.

Managed content is delimited by `CREED_BLOCK_BEGIN` / `CREED_BLOCK_END` marker lines. Each file has exactly one managed block, which setup and update replace entirely with the template block. The merged document is: custom H1 (or template headline) → managed block → user content (anything outside the block, which includes text found before it). For skills, the frontmatter always comes from the template. Files with several blocks are rejected.

## Key Directories

- `bin/` - CLI entry (`cli.js`) and command implementations (`setup.js`, `update.js`)
- `utils/` - shared constants (version, template URL, markers, managed file list) and `install.js` (template download, merge/replace of managed blocks, version file writing)
- `src/` - templates distributed to target projects (`AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `.creed/SUGGESTIONS.md`, `.creed/BACKLOG.md`, `.agents/skills/*`); root `AGENTS.md`, `ARCHITECTURE.md` and `SECURITY.md` point to them and add project-specific content
- `.agents/skills/` - stub skills pointing to `src/.agents/skills/` so agent harnesses discover them in this repo; running `setup` or `update` here would merge full template content into them
- `test/` - Vitest suites for setup and update (temp dirs, mocked `https.get` and `readline`); setup uses snapshots, update uses explicit expectations
- `playground/` - manual sandbox; `test.js` runs the CLI against `void/` (empty project) and `established/` (pre-existing files)
- `.creed/` - versioned agent work files; `SUGGESTIONS.md` (pending findings about agent instructions) and `BACKLOG.md` (pending project tasks) are merged/updated by setup and update like other managed files, `version` is written by setup and update
- `.vscode/` - editor file associations only

Root documents: `README.md` (usage and merge behavior), [ROADMAP.md](./ROADMAP.md) (implemented and planned features).

## Entry Points

- CLI: `bin/cli.js` (`bin.agentcreed` in `package.json`)
- Package main: `index.js` (prints usage hint only)
- Tests: `pnpm test`
- Manual sandbox: `node playground/test.js setup|update` (hits GitHub, modifies playground files)

## Conventions

- ESM imports, `node:` prefix for built-ins
- No semicolons, single quotes, 2-space indentation
- LF line endings in the repository (via `.gitattributes`)
- Exported functions documented with JSDoc; constants with one-line `/** */` comments
- Managed file paths are listed once in `utils/constants.js` (`CREED_FILES`, `CREED_SKILLS`, `CREED_VERSION_FILE`, `CREED_SUGGESTIONS_FILE`, `CREED_BACKLOG_FILE`)

## Quick Commands

| Action  | Command                             |
| ------- | ----------------------------------- |
| Install | `pnpm install`                      |
| Test    | `pnpm test`                         |
| Try CLI | `node playground/test.js setup`     |

No lint, format, build or git-hook tooling is configured.

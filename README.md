# AgentCreed

Methodology for adding AI agents' instructions to SW projects

**WARNING: This is an early-stage WIP not ready for production use.**

Feedback and help are welcome from day one.

## Motivation

I have multiple SW projects and I am in the process of improving their capabilities for AI-driven development using AI agents. A solid set of instructions is required both to improve output quality and to reduce execution costs. Because I honor the DRY principle, I don't like to repeat myself over and over again. So I am collecting the repeating patterns, evaluating what works and what doesn't and trying to create a baseline that can be quickly applied to any project.

## Goals

To provide a set of instructions that can be quickly applied to any project, either brand new or an existing one, that will help:

- improving AI responses, making them better focused and more helpful
- speeding up the execution
- optimizing the credit costs
- reducing the risk of security incidents
- following good practices to guide less skilled devs

## Non-goals

`AgentCreed` will work best for the short-circuit `human prompt -> agent response -> human review` workflow.

It is not - at least not yet - oriented toward fully autonomous agentic systems. It is not imposing boundaries on self-operating agents. This might be a subject of later improvement.

## Principles

- This should be a universal portable solution applicable to any AI harness tool used
- Thus the solution is centered around the [`AGENTS.md`](https://agents.md/) file, which became a de facto standard lately
- Repeatable actions and workflows are described using [`Agent skills`](https://agentskills.io/) which is also a well-established tool
- On the contrary, this project is less focused on `Agents personas` as this seems to be fragmented and vendor-specific (as of August 2026)
- As I am mostly a JS/TS dev now, the output is an NPM CLI tool that can be invoked in Node-like environments and help to scaffold everything
- The project carries universal rules and principles while keeping project-specific needs in mind (via managed blocks in instruction files with project-specific content kept after them)
- Instruction sets for specific languages and tools will be gradually added

## Usage

- use `npx agentcreed setup` - CLI runs a wizard to create missing files and update existing instruction files to the latest versions (while preserving project-specific sections)

### Setup behavior

The `npx agentcreed setup [true|false]` command processes `AGENTS.md`, `ARCHITECTURE.md`, and `SECURITY.md` in the current working directory, followed by `.creed/SUGGESTIONS.md` (a file where agents collect pending findings about agent instructions), `.creed/BACKLOG.md` (a file where agents collect pending tasks for the project), and the `creed-dev`, `creed-chat`, `creed-scan`, `creed-check` and `creed-explain` skills. Missing files are copied from the complete templates, creating directories as needed. Finally, the installed CLI version is written to `.creed/.version`, and the closing hint suggests `creed-check` if `.creed/.version` already existed or `creed-scan` on a fresh setup.

Templates come from the GitHub release tag matching the installed CLI version (`refs/tags/v<version>/src/`).

For existing documents, setup keeps a custom H1 headline (the first non-blank line, when it starts with `#` followed by a space); otherwise the template headline is used. An existing skill always gets its YAML frontmatter replaced by the template metadata. The Agent Creed block is then replaced with the fresh template content and all other content is retained after it. Only standalone Agent Creed marker lines define the block; inline mentions are ordinary text. Edits inside the managed block are overwritten on repeat runs.

**Each file must contain at most one managed block, and user content belongs after it.** Content found before the block (other than the H1) is moved after it. Files with more than one block are rejected with an error; remove the extra blocks manually.

Existing files are merged in memory, preserving CRLF line endings when present and normalizing boundary blank lines; duplicate instructions, indentation, and internal spacing are retained. Files whose content is unchanged are not rewritten.

Unless `true` is passed, setup asks whether to run automatically or prompt once per file; declining a file leaves it untouched. Automatic mode suppresses further per-file prompts (excluding the [agent command permissions](#agent-command-permissions)). Malformed markers, unterminated skill frontmatter, and failed downloads stop setup with an error. A failed merge leaves its original intact; files already processed are not rolled back.

When used on project where Agent Creed is already established, it effectively acts like an update - the project specific content is preserved, Agent Creed blocks and files are updated to the latest versions.

### Agent command permissions

Before writing `.creed/.version`, both setup and update offer to pre-approve a short list of safe commands (e.g. `git status`, `git pull --ff-only`) for individual agent tools, and to force a confirmation or refusal for risky ones (e.g. `git stash drop`). This prompt is **always shown, even in automatic mode**, because the files change what agents may do without asking. Enter the numbers of the tools to configure, separated by commas (an empty answer picks none):

| Tool | File |
| ---- | ---- |
| VS Code | `.vscode/settings.json` |
| Claude Code | `.claude/settings.json` |
| Gemini CLI | `.gemini/settings.json` |
| Cursor CLI | `.cursor/cli.json` |

Values come from the template of the same path. Existing files are merged, not overwritten: only the relevant keys are touched, other settings stay, objects are merged key by key and missing array items are appended. Files must be plain JSON (comments are not supported); an invalid file stops the run with an error and stays unchanged.

## Contributing

For more details about project architecture, see [ARCHITECTURE.md](ARCHITECTURE.md)

Run the focused tests with `pnpm test` (the script calls `pnpm vitest run`, so pnpm is required). Tests use temporary directories and mocked downloads, without accessing GitHub.

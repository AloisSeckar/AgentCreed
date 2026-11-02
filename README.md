# AgentCreed

Methodology for adding AI agents' instructions into SW projects

**WARNING: This is an early stage WIP and I am not even sure whether it makes it somewhere.**

Feedback and help are welcome from day one.

## Motivation

I am having multiple SW projects and I am in process of improving their capabilities for AI-driven development using AI agents. Solid set of instructions is required both to improve output quality and to reduce the execution costs. Because I honor DRY principle, I don't like to repeat myself over and over again. So I am collecting the repeating patterns, evaluating what works and what doesn't and I am trying to create some baseline that can be quickly applied to any project.

## Goals

To provide a set of instructions that can be quickly applied to any project, either brand new or an existing one, that will help:

- improving AI responses making them better focused and more helpful
- speeding up the execution
- optimizing the credit costs
- reducing risk of security incidents
- following good practices to guide less skilled devs

## Non-goals

`AgentCreed` will work best for the short-circuit `human prompt -> agent response -> human review` workflow.

It is - at least not yet - oriented on fully autonomous agentic systems. It is not imposing boundaries on self-operating agents. This might be a subject of later improvement.

## Principles

- This should be an univeral portable solution applicable to any AI harness tool used
- Thus the solution is centered around [`AGENTS.md`](https://agents.md/) file which became a de-facto standard lately
- Repeatable actions and workflows are described using [`Agent skills`](https://agentskills.io/) which is also a well-established tool
- On the contrary, this project is less focused on `Agents personas` as this seems to be fragmented and vendor-specific (as of August 2026)
- As I am mostly JS/TS dev now, the output will be a NPM CLI tool that can be invoked in Node-like enviroments and help to scaffold everything
- The project will carry on universal rules and priciples while having project-specific needs in mind (e.g. via a placeholders in instruction files)
- Instruction sets for specific languages and tools will be gradually added

## Usage

- to start, just use `npx agentcreed setup` - CLI will run a wizard to create/adjust necessary files
- to update existing instance, use `npx agentcreed update` - CLI will update existing instruction files to latest versions (while preserving project-specific sections) and create new files if needed

### Setup behavior

Setup processes `AGENTS.md`, `ARCHITECTURE.md`, and `SECURITY.md` in the current working directory, followed by `.creed/SUGGESTIONS.md` (a file where agents collect pending findings about agent instructions), `.creed/BACKLOG.md` (a file where agents collect pending tasks for the project), and the `creed-dev`, `creed-chat`, `creed-scan` and `creed-check` skills. Missing files are copied from the complete templates, creating directories as needed. Finally, the installed CLI version is written to `.creed/version`.

Templates currently come from the GitHub `main` branch under `src/`. The displayed target version does not pin downloaded content.

For existing documents, setup keeps a custom H1 headline (the first non-blank line, when it starts with `#`); otherwise the template headline is used. An existing skill always gets its YAML frontmatter replaced by the template metadata. The Agent Creed block is then replaced with the fresh template content and all other content is retained after it. Only standalone Agent Creed marker lines define the block; inline mentions are ordinary text. Edits inside the managed block are overwritten on repeat runs.

**Each file must contain at most one managed block, and user content belongs after it.** Content found before the block (other than the H1) is moved after it. Files with more than one block are rejected with an error; remove the extra blocks manually.

Existing files are assembled in sibling `_temp.md` files using whole-block appends before being renamed over the originals. Line endings become LF and boundary blank lines are normalized; duplicate instructions, indentation, and internal spacing are retained. Repeating setup with unchanged templates produces the same merged contents.

Manual mode asks once per file; declining leaves that file untouched. Automatic mode suppresses further prompts. Malformed markers, unterminated skill frontmatter, failed downloads, and temporary-file collisions stop setup with an error. A failed merge leaves its original intact; files already processed are not rolled back.

### Update behavior

`npx agentcreed update [true|false]` refreshes an existing instance. It asks whether to run automatically (no prompts) or ask once per file, then goes through the same file list as setup (`AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `.creed/SUGGESTIONS.md`, `.creed/BACKLOG.md` and the `creed-dev`, `creed-chat`, `creed-scan` and `creed-check` skills).

- Missing files are created from the latest templates.
- Existing files are handled exactly like in setup: the single Agent Creed block is replaced with the latest one from GitHub, skill frontmatter is replaced by the template metadata, a custom H1 headline is kept and all other user content is placed after the block.
- Existing files without a block get it added below the headline (or below skill frontmatter).
- Files with more than one block are rejected with an error.
- Files whose content is unchanged are not rewritten.
- The `.creed/version` file is updated with the installed CLI version.

## Contributing

For more details about project architecture, see [ARCHITECTURE.md](ARCHITECTURE.md)

Run the focused tests with `pnpm test` (the script calls `pnpm vitest run`, so pnpm is required). Tests use temporary directories and mocked downloads, without accessing GitHub.

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
- to update existing instance, use `npx agendcreed update` - CLI will update existing instruction files to latest versions (while preserving project-specific sections) and create new files if needed

### Setup behavior

Setup processes `AGENTS.md`, `ARCHITECTURE.md`, and `SECURITY.md` in the current working directory, followed by `.agents/skills/creed-dev/SKILL.md`. Missing files are copied from the complete templates, creating directories as needed.

Templates currently come from the GitHub `main` branch under `src/`. The displayed target version does not pin downloaded content; tag-based fetching is deferred.

For existing documents, setup preserves the first line. For an existing skill, it preserves the YAML frontmatter, or adds template metadata when frontmatter is absent. It then inserts fresh Agent Creed content and retains user instructions outside the existing managed blocks. Only standalone Agent Creed marker lines define these blocks; inline mentions are ordinary text. Edits inside managed blocks are replaced on repeat runs, while user content between separate blocks is retained.

Existing files are assembled in sibling `_temp.md` files using whole-block appends before being renamed over the originals. Line endings become LF and boundary blank lines are normalized; duplicate instructions, indentation, and internal spacing are retained. Repeating setup with unchanged templates produces the same merged contents.

Manual mode asks once per file; declining leaves that file untouched. Automatic mode suppresses further prompts. Malformed markers, unterminated skill frontmatter, failed downloads, and temporary-file collisions stop setup with an error. A failed merge leaves its original intact; files already processed are not rolled back. A pre-existing `_temp.md` file is never overwritten or removed.

Run the focused tests with `npm test` (or `pnpm test`). Tests use temporary directories and mocked downloads, without accessing GitHub.

## Structure

- `bin` - folder with CLI scripts' definitions
- `src` - folder with templates for agents instructions

MORE TBA

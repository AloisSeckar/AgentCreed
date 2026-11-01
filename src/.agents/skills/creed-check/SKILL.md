---
name: creed-check
description: 'Methodology for checking consistency of instruction files and relevance and accuracy of the documentation'
---

<!-- ↓↓↓ agentcreed ↓↓↓ -->

# creed-check

Following process is used to check and fix current state of agent instructions and project documentation in projects driven by AgentCreed. Follow it step by step to ensure effective assessment.

For the purpose of this skill, consider:

- `project root` is the folder with the top-level `AGENTS.md` (usually the repository root). If it redirects to instruction files elsewhere, follow the redirection.
- `creed-files` are `AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `.creed/BACKLOG.md` and `.creed/SUGGESTIONS.md` in `project root`. Files with the same names in other folders are ordinary `linked-files`.
- `linked-files` are files a read file refers to by a link or by explicit name or path, including skills it requires to be used (e.g. `creed-dev`). Exclude `creed-files`. Read each file only once.
- `security-boundaries` impose limits on code from security perspective that must always be fulfilled when making changes.
- `agent-instructions` describe how agents should (or shouldn't) interact with the code or behave when performing given tasks.
- `documented-facts` describe the project structure and its behavior (to be "documented", the fact must be written somewhere within the project).
- `source` of an item is the exact file and passage it was taken from.

Split a passage into separate items only where it holds independent rules. Keep a condition together with its consequence (e.g. "do X and notify the user" is one item).

Text between AgentCreed markers is managed by AgentCreed and gets overwritten on `agentcreed update`. Do not edit it, unless `AGENTS.md` allows it. Log the finding into `.creed/SUGGESTIONS.md` instead.

When moving or rephrasing a `source`, move text word for word where possible and keep its strength words (MUST, ALWAYS, NEVER, pause, make sure).

## 1. Gathering information

First read the key files line-by-line to get the full picture about current status.

Start with empty `security-boundaries`, `agent-instructions`, `documented-facts` and `questions` lists.

For each step below: if the main file is not present in `project root`, log its absence into `.creed/SUGGESTIONS.md` and add a question whether to create it into `questions`.

### 1.1 Security Boundaries

Read `SECURITY.md` in `project root` and its `linked-files`. Append all claims established by their content to `security-boundaries`.

### 1.2 Agent Instructions

Read `AGENTS.md` in `project root` and its `linked-files`. Append all claims established by their content to `agent-instructions`.

### 1.3 Documented Facts

Read `ARCHITECTURE.md` in `project root` and its `linked-files`, plus `README.md` if present. Append all claims established by their content to `documented-facts`.

## 2. Verifying consistency

Now analyze the gathered items closely and systematically to discover flaws.

Start with empty `fixes` list. Whenever you make any edit based on rules below, note the change down into it.

For each item of `security-boundaries` list, verify it is:

1. Really a security boundary. If it is giving instructions that are not related to security, move its source into `AGENTS.md` (or appropriate nested file linked from there). If it just describes the project, move its source into `ARCHITECTURE.md` (or appropriate nested file linked from there).
2. Clear and unambiguous. Rephrase the source if needed. If the intention is not clear to you, add it into `questions`.
3. Not duplicated by any other item in any list. If yes, keep only one in the source.
4. Not contradicting `documented-facts`. If yes, add it into `questions` and ask what should win.

For each item of `agent-instructions` list, verify it is:

1. Really an agent instruction. If it is imposing a security boundary, move its source into `SECURITY.md` (or appropriate nested file linked from there). If it just describes the project, move its source into `ARCHITECTURE.md` (or appropriate nested file linked from there).
2. Clear and unambiguous. Rephrase the source if needed. If the intention is not clear to you, add it into `questions`.
3. Not duplicated by any other item in any list. If yes, keep only one in the source.
4. Not conflicting with rules imposed by `security-boundaries`. If yes, security rules must win and the instruction must be removed from source.
5. Not contradicting `documented-facts`. If yes, add it into `questions` and ask what should win.
6. Effective. Files, skills, tools and commands it refers to must exist and be reachable by agents. If not, fix the reference or add it into `questions`.

For each item of `documented-facts` list, verify it is:

1. Really a documented fact. If it is imposing a security boundary, move its source into `SECURITY.md` (or appropriate nested file linked from there). If it is giving instructions that are not related to security, move its source into `AGENTS.md` (or appropriate nested file linked from there). If it is a pending task, TODO or open question, move it into `.creed/BACKLOG.md`.
2. Clear and unambiguous. Rephrase the source if needed. If the intention is not clear to you, add it into `questions`.
3. Not duplicated by any other item in any list. If yes, keep only one in the source.
4. Accurate. Verify it against the codebase and configuration (e.g. package manifests, scripts, folder structure). Fix verifiably wrong facts, remove transient states (e.g. test counts) and add uncertain cases into `questions`.

After all items are checked:

1. If `questions` is not empty, stop and ask user for clarification of all of them at once. Make appropriate changes to reflect user info, note them into `fixes` and empty `questions`.
2. If `fixes` is not empty, gather the lists again (chapter 1) and start over with this chapter. If the same passage would be changed back and forth, stop and ask user instead.
3. Once a pass ends with empty `fixes` and `questions`, proceed to next chapter.

## 3. Report

Respond with a summary of:

- findings and changes made in the files, grouped by file
- items logged into `.creed/SUGGESTIONS.md` and `.creed/BACKLOG.md`
- every moved or rephrased rule with its old and new wording, marked as kept, merged, strengthened, weakened or dropped

<!-- ↑↑↑ agentcreed ↑↑↑ -->

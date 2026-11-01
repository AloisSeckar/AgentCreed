---
name: creed-check
description: 'Methodology for checking consistency of instruction files and relevance and accuracy of the documentation'
---

<!-- ↓↓↓ agentcreed ↓↓↓ -->

# creed-check

Following process is used to check and fix current state of agent instructions and project documentation in projects driven by AgentCreed. Follow it step by step to ensure effective assesment.

For the purpose of this skill, consider:

- `creed-files` are: `AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `.creed/BACKLOG.md` and `.creed/SUGGESTIONS.md`
- `agent-instructions` describe how agents should (or shouldn't) interact with the code or behave when performing given tasks
- `security-boundaries` impose limits on code from security perspective that must always be fullfilled when making changes
- `documented-facts` are describing the project structure and its behavior (to be "documented", the fact must be written somewhere within the project)  

## 1. Gathering information

First read the key files line-by-line to get the full picture about current status.

### 1.1 Security Boundaries

Start with empty `security-boundaries` list.

Read the `SECURITY.md` file in project root and make a list of claims established by its content. Append this list to `security-boundaries`. If `SECURITY.md` file is not present in project root, log its absence into `.creed/SUGGESTIONS.md`. If `SECURITY.md` file links to other files (excluding `creed-files`), read them as well and append any other claims established in there to `security-boundaries`.

### 1.2 Agent Instructions

Start with empty `agent-instructions` list.

Read the `AGENTS.md` file in project root and make a list of claims established by its content. Append this list to `agent-instructions`. If `AGENTS.md` file is not present in project root, log its absence into `.creed/SUGGESTIONS.md`. If `AGENTS.md` file links to other files (excluding `creed-files`), read them as well and append any other claims established in there to `agent-instructions`.

### 1.3 Documented Facts

Strt with empty `documented-facts` list.

Read the `ARCHITECTURE.md` file in project root and make a list of claims established by its content. Append this list to `documented-facts`. If `ARCHITECTURE.md` file is not present in project root, log its absence into `.creed/SUGGESTIONS.md`. If `ARCHITECTURE.md` file links to other files (excluding `creed-files`), read them as well and append any other claims established in there to `security-boundaries`.

## 2. Verifying consistency

Now let's analyze gathered fact closely and systematically to discover flaws.

Start with empty `questions` list.

Start with empty `fixes` list. Whenever you make any edit based on rules below, note the change down into it.

For each item of `security-boundaries` list, verify it is:

1. Really a security boundary. If it is giving instructions that are not related to security, move its source into `AGENTS.md` (or appropriate nested file linked from there). If it just describes the project, move its source into `ARCHITECTURE.md` (or appropriate nested file linked from there).
2. Clear and unambiguous. Rephrase the source if needed. If the intention is not clear to you, note it down into `questions` list.
3. Not duplicated by any other. If yes, keep only one in the source.

For each item of `agent-instructions` list, verify it is:

1. Really an agent instruction. If it is imposing a security boundary, move its source into `SECURITY.md` (or appropriate nested file linked from there). If it just describes the project, move its source into `ARCHITECTURE.md` (or appropriate nested file linked from there).
2. Clear and unambiguous. Rephrase the source if needed. If the intention is not clear to you, note it down into `questions` list.
3. Not duplicated by any other. If yes, keep only one in the source.
4. Not conflicting with rules imposed by `security-boundaries`. If yes, security rules must win and the instruction must be removed from source.
5. Verify the instruction is not contradicting facts in `documented-facts`. If yes, note it down and ask the user what should win at the end of chapter 2.

For each item of `documented-facts` list, verify it is:

1. Really a documented fact.  If it is imposing a security boundary, move its source into `SECURITY.md` (or appropriate nested file linked from there). If it is giving instructions that are not related to security, move its source into `AGENTS.md` (or appropriate nested file linked from there).
2. Clear and unambiguous. Rephrase the source if needed. If the intention is not clear to you, note it down and ask the user at the end of chapter 2.
3. Not duplicated by any other. If yes, keep only one in the source.

If `questions` list is not empty, stop and ask user for clarification. Then make appropriate changes to reflect user info.

If `fixes` is not empty, start over with this chapter. Once it is empty, proceed to next.

## 3. Report

Respond with a summary of findings and changes made in the files.

<!-- ↑↑↑ agentcreed ↑↑↑ -->

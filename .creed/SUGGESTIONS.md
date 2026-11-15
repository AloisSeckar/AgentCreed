# Suggestions

Refer to [/src/.creed/SUGGESTIONS.md](../src/.creed/SUGGESTIONS.md) for description and usage details of this file.

List of active unresolved suggestions about agent instructions quality and consistency follows:

1. Contradiction: `AGENTS.md` says about outdated docs not related to the current task: "Otherwise do not edit it, but log it into `BACKLOG.md`". `creed-check` (step 2, documented facts, item 4) says "Fix verifiably wrong facts". Say which rule wins during a `creed-check` or `creed-scan` session.
2. Contradiction: the `creed-scan` output template has a "Needs Clarification" section for open questions in `ARCHITECTURE.md`. The `creed-check` session that `creed-scan` runs at the end then moves open questions and pending tasks out of `ARCHITECTURE.md` into `BACKLOG.md`. Have `creed-scan` ask the user or log to `BACKLOG.md` instead of persisting that section.
3. Inefficiency: `creed-dev` says "If there are uncommitted changes or the pull fails, stop and inform the user." Right after `agentcreed setup`, its generated files are always untracked, so the first skill run always stops. Have the setup tell the user to commit the generated files, or allow untracked AgentCreed files in that check.

# Suggestions

Refer to [/src/.creed/SUGGESTIONS.md](../src/.creed/SUGGESTIONS.md) for description and usage details of this file.

List of active unresolved suggestions about agent instructions quality and consistency follows:

1. Review automatic Git synchronization in `src/.agents/skills/creed-dev/SKILL.md`: "Before starting any work, ensure the latest remote state is pulled" and the mandatory stash/pull/pop conflict procedure can mutate unrelated user work or leave conflicts. Define approval and dirty-worktree handling before requiring these actions.

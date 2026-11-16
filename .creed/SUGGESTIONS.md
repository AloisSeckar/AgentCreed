# Suggestions

Refer to [/src/.creed/SUGGESTIONS.md](../src/.creed/SUGGESTIONS.md) for description and usage details of this file.

List of active unresolved suggestions about agent instructions quality and consistency follows:

1. Contradiction: the `creed-scan` output template has a "Needs Clarification" section for open questions in `ARCHITECTURE.md`. The `creed-check` session that `creed-scan` runs at the end then moves open questions and pending tasks out of `ARCHITECTURE.md` into `BACKLOG.md`. Have `creed-scan` ask the user or log to `BACKLOG.md` instead of persisting that section.

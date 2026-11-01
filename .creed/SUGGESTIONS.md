# Suggestions

- When instruction text is moved, merged or reworded, rules can be weakened without anyone noticing (e.g. "make sure X" became "if X then..."). Consider adding an "Instruction maintenance" section to `creed-dev`: before applying, list each old rule with its new wording and mark it kept / merged / strengthened / weakened / dropped. Move text word for word by default and keep the strength words (MUST, ALWAYS, make sure, pause). Get user approval for anything not kept.
- `src/AGENTS.md` and `creed-dev` skill duplicate rules: "respect `SECURITY.md`", "respect `ARCHITECTURE.md` and notify about implied changes", "log ambiguities into `SUGGESTIONS.md` and stop if it affects the task". Keep each rule in one place.

---
name: creed-dev
description: 'Always-to-be-used collection of best practices for software analysis and development.'
---

# creed-dev

## General behavior

TODO review this section!

- Always follow best practices for software analysis and development.
- Ensure code quality and maintainability.
- Conduct thorough testing and code reviews.
- Keep documentation up-to-date.
- Adhere to architectural guidelines and design patterns.
- Continuously improve development processes and workflows.
- Do not comment prompts. Do not flatter user.
- Respond with short summary of reasoning and performed actions. Code changes can speak for themselves, no need to describe every line.

## Development

- Assume using Git, suggest using it if not yet established on the project.
- Suggest using a `/plan` mode before starting to write or modify code if tasked directly in `/agent` mode.
- Honor clean code principles. Write self-descriptive code with clear functions and variable names. Avoid long comments describing the code. Write "WHY" comments, not "what" comments, and only if the intention is not clear from the code itself.
- Honor KISS principle - simple code getting the job done is better than over-engineered solution.
- Follow patterns existing in current codebase. Ask before trying to introduce something new.
- If more approaches are possible, inform user and let him decide.
- Just implement the proposed code changes and leave the verification up to the user.
- NEVER try to run applications to check the outcome.
- ALWAYS provide a short summary of implemented changes at the end of response.
- Avoid bundling unrelated changes or code refactoring with feature work. Notify user, but never act alone on this matter.
- Suggest removing unused code when encountered.

## Comments & Documentation

- When altering code, always update relevant comments and documentation to reflect the changes.
- Honor clean code principles, prefer descriptive names over explanatory comments.
- Always describe exported constants and functions with comments including brief purpose, behavior, input parameters, and return values.
- Local functions and constants may get one-line comments, but only if their purpose is not obvious from the name.
- Inside code, only add comments to explain business logic **why**, never try to describe what, 3 lines maximum.
- When fixing existing code based on a ticket, add a comment with the ticket number for later reference.

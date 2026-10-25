# Project roadmap

## Internal files

- [x] `.creed/SUGGESTIONS.md` - dedicated file where agents store their findings
- [x] `.creed/version` - tracker of currently installed version

## Instruction files

- [x] `AGENTS.md` - basic context with progressive disclosure (enforce `creed-dev` skill and link to other instruction files)
- [x] `ARCHITECTURE.md` - how to keep info about the project (tech stack, structure, workflows, etc)
- [x] `SECURITY.md` - core security boundaries

## Skills

- [x] wrapping skill `creed-dev` for high level instructions about the way of working
- [x] `creed-chat` skill making agent asking more before working randomly based on <https://www.skills.sh/mattpocock/skills/grill-me>
- [x] `creed-scan` skill helping agent to scaffold project-specific info based on <https://www.skills.sh/cloudai-x/claude-workflow-v2/analyzing-projects>
- [ ] custom skill for converting pdf/docx (with specs) to `.md` files
- [ ] custom skill for analyzing / design / planning

## CLI

- [x] remotely executable (`npx agentcreed setup`) Node script for establishing this in any project
  - [x] scaffolding files from `/src` (if not exist yet)
  - [x] appending relevant part into existing `.md` files
  - [ ] scaffold `.creed/SUGGESTIONS.md`
  - [ ] add `.creed` folder into `.gitignore`
- [x] remotely executable (`npx agentcreed update`) Node script for updating instructions when already established
  - [ ] replace relevant part in existing `.md` files
  - [ ] overwrite skills

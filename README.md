# AgentCreed

Methodology for adding AI agents' instructions into SW projects

**WARNING: This is an early stage WIP and I am not even sure whether it makes it somewhere.**

Feedback and help are welcome.

## Motivation

I am having multiple SW projects and I am in process of improving their capabilities for AI-driven development using AI agents. Solid set of instructions is required both to improve output quality and to reduce the execution costs. Because I honor DRY principle, I don't like to repeat myself over and over again. So I am collecting the repeating patterns, evaluating what works and what doesn't and I am trying to create some baseline that can be quickly applied to any project. The 

## Principles

- I want univeral portable solution applicable to any AI harness tool used
- Thus this solution centered around [`AGENTS.md`](https://agents.md/) file which became a de-facto standard lately
- Repeatable actions and workflows are described using [`Agent skills`](https://agentskills.io/) which is also a well-established tool
- This project is less focused on `Agents personas` as this seems to be fragmented and vendor-specific (as of August 2026)
- As I am mostly JS/TS dev now, the output will be a NPM CLI tool that can be invoked in Node-like enviroments and help to scaffold everything
- The project will carry on universal rules and priciples while having project-specific needs in mind (e.g. via a placeholders in instruction files)

MORE TBA

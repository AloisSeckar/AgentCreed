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

MORE TBA

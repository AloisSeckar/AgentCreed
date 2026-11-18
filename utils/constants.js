// AgentCreed constants

/** Current AgentCreed version */
export const CREED_VERSION = '0.0.7'

/** GitHub URL hosting AgentCreed files, pinned to the release tag of CREED_VERSION */
export const CREED_FILES_URL = `https://raw.githubusercontent.com/AloisSeckar/AgentCreed/refs/tags/v${CREED_VERSION}/src/`

/** Path to the generated file holding the installed AgentCreed version */
export const CREED_VERSION_FILE = '.creed/.version'

/** Path to the file with the timestamp of the last `creed-check` run */
export const CREED_CHECK_FILE = '.creed/.check'

/** Path to the file for storing agent suggestions */
export const CREED_SUGGESTIONS_FILE = '.creed/SUGGESTIONS.md'

/** Path to the file for storing pending project tasks */
export const CREED_BACKLOG_FILE = '.creed/BACKLOG.md'

/** Structural marker in instruction files - begin */
export const CREED_BLOCK_BEGIN = '<!-- \u2193\u2193\u2193 agentcreed \u2193\u2193\u2193 -->'

/** Structural marker in instruction files - end */
export const CREED_BLOCK_END = '<!-- \u2191\u2191\u2191 agentcreed \u2191\u2191\u2191 -->'

/** Paths to the AgentCreed skill files */
export const CREED_SKILLS = [
  '.agents/skills/creed-dev/SKILL.md', 
  '.agents/skills/creed-chat/SKILL.md', 
  '.agents/skills/creed-scan/SKILL.md',
  '.agents/skills/creed-check/SKILL.md',
  '.agents/skills/creed-explain/SKILL.md',
]

/** List of AgentCreed instruction files */
export const CREED_FILES = [
  'AGENTS.md', 
  'ARCHITECTURE.md', 
  'SECURITY.md', 
  CREED_SUGGESTIONS_FILE,
  CREED_BACKLOG_FILE,
  ...CREED_SKILLS,
]

/** Optional agent permission files: the template of the same path provides the values at each key path to merge in */
export const CREED_AGENT_SETTINGS = [
  { label: 'VS Code', file: '.vscode/settings.json', paths: [['chat.tools.terminal.autoApprove']] },
  { label: 'Claude Code', file: '.claude/settings.json', paths: [['permissions', 'allow'], ['permissions', 'ask']] },
  { label: 'Gemini CLI', file: '.gemini/settings.json', paths: [['tools', 'allowed'], ['tools', 'exclude']] },
  { label: 'Cursor CLI', file: '.cursor/cli.json', paths: [['permissions', 'allow'], ['permissions', 'deny']] },
]

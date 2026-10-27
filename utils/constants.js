// AgentCreed constants

/** Current AgentCreed version */
// TODO start using in CREED_FILES_URL when first version with tag is released
export const CREED_VERSION = '0.0.0'

/** GitHub URL hosting AgentCreed files */
export const CREED_FILES_URL = 'https://raw.githubusercontent.com/AloisSeckar/AgentCreed/refs/heads/main/src/'

/** Path to the generated file holding the installed AgentCreed version */
export const CREED_VERSION_FILE = '.creed/version'

/** Path to the generated file for storing agent suggestions */
export const CREED_SUGGESTIONS_FILE = '.creed/SUGGESTIONS.md'

/** Structural marker in instruction files - begin */
export const CREED_BLOCK_BEGIN = '<!-- \u2193\u2193\u2193 agentcreed \u2193\u2193\u2193 -->'

/** Structural marker in instruction files - end */
export const CREED_BLOCK_END = '<!-- \u2191\u2191\u2191 agentcreed \u2191\u2191\u2191 -->'

/** Paths to the AgentCreed skill files */
export const CREED_SKILLS = [
    '.agents/skills/creed-dev/SKILL.md', 
    '.agents/skills/creed-chat/SKILL.md', 
    '.agents/skills/creed-scan/SKILL.md',
]

/** List of AgentCreed instruction files */
export const CREED_FILES = [
    'AGENTS.md', 
    'ARCHITECTURE.md', 
    'SECURITY.md', 
    ...CREED_SKILLS,
]

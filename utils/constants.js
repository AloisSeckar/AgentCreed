
/** Current AgentCreed version */
// TODO uncomment and use when first version with tag is released
// export const CURRENT_VERSION = '0.0.0'

// export const REMOTE_CREED_FILES_VERSION = '0.0.0'

/** GitHub URL hosting AgentCreed files */
export const REMOTE_CREED_FILES_URL = 'https://raw.githubusercontent.com/AloisSeckar/AgentCreed/refs/heads/main/src/'

/** Structural marker in instruction files - begin */
export const CREED_BLOCK_BEGIN = '<!-- \u2193\u2193\u2193 agentcreed \u2193\u2193\u2193 -->'

/** Structural marker in instruction files - end */
export const CREED_BLOCK_END = '<!-- \u2191\u2191\u2191 agentcreed \u2191\u2191\u2191 -->'

/** Paths to the AgentCreed skill files */
export const CREED_SKILLS = ['.agents/skills/creed-dev/SKILL.md', '.agents/skills/creed-chat/SKILL.md']

/** List of AgentCreed instruction files */
export const CREED_FILES = ['AGENTS.md', 'ARCHITECTURE.md', 'SECURITY.md', ...CREED_SKILLS]

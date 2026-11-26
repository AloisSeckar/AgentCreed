// Helpers for AgentCreed setup command

import fs from 'node:fs/promises'
import path from 'node:path'
import {
  createFileFromWebTemplate, deletePath, pathExists, promptUser,
  showDebug, showMessage, updateJsonFile,
} from 'elrh-cosca'
import {
  CREED_AGENT_SETTINGS, CREED_BLOCK_BEGIN, CREED_BLOCK_END,
  CREED_CHECK_FILE, CREED_FILES_URL,
  CREED_VERSION, CREED_VERSION_FILE,
} from './constants.js'

// Index of the closing frontmatter line, or -1 when the document has no frontmatter.
function findFrontmatterEnd(lines) {
  if (!/^---[ \t]*$/.test(lines[0])) return -1
  const closing = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)[ \t]*$/.test(line))
  if (closing === -1) throw new Error('Unterminated skill frontmatter')
  return closing
}

// Split a document into its header (H1 headline or skill frontmatter, null when absent)
// and the remaining lines.
function splitDocument(text, isSkill) {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n')
  if (isSkill) {
    const closing = findFrontmatterEnd(lines)
    return { header: closing === -1 ? null : lines.slice(0, closing + 1).join('\n'), body: lines.slice(closing + 1) }
  }
  const first = lines.findIndex(line => line.trim())
  if (first !== -1 && /^# /.test(lines[first])) return { header: lines[first], body: lines.slice(first + 1) }
  return { header: null, body: lines }
}

// Range of the single managed block in `lines`, or null when there is none.
function findManagedBlock(lines) {
  const blocks = []
  let opening = -1
  for (const [index, line] of lines.entries()) {
    if (line.trim() === CREED_BLOCK_BEGIN) {
      if (opening !== -1) throw new Error('Nested Agent Creed opening marker')
      opening = index
    } else if (line.trim() === CREED_BLOCK_END) {
      if (opening === -1) throw new Error('Agent Creed closing marker without an opening marker')
      blocks.push({ start: opening, end: index })
      opening = -1
    }
  }
  if (opening !== -1) throw new Error('Agent Creed opening marker without a closing marker')
  if (blocks.length > 1) throw new Error('Expected a single Agent Creed block per file')
  return blocks[0] ?? null
}

function trimBlankLines(text) {
  const lines = text.split('\n')
  let start = 0
  let end = lines.length
  while (start < end && !lines[start].trim()) start++
  while (end > start && !lines[end - 1].trim()) end--
  return lines.slice(start, end).join('\n')
}

// Sections of the merged document: header, the template block
// and the user content (everything outside the block).
// Only a custom H1 headline is kept in front of the block; 
// skill frontmatter always comes from the template.
function getMergeSections(original, template, isSkill) {
  const source = splitDocument(template, isSkill)
  if (source.header === null) throw new Error('Template is missing its headline or skill frontmatter')
  const sourceBlock = findManagedBlock(source.body)
  if (!sourceBlock) throw new Error('Template is missing Agent Creed markers')
  const existing = splitDocument(original, isSkill)
  const found = findManagedBlock(existing.body)
  const before = found ? existing.body.slice(0, found.start) : existing.body
  const after = found ? existing.body.slice(found.end + 1) : []
  return {
    bom: original.startsWith('\uFEFF') ? '\uFEFF' : '',
    header: (isSkill ? null : existing.header) ?? source.header,
    block: source.body.slice(sourceBlock.start, sourceBlock.end + 1).join('\n'),
    body: [before, after].map(part => trimBlankLines(part.join('\n'))).filter(Boolean).join('\n\n'),
  }
}

function composeDocument({ header, block, body }) {
  return `${header}\n\n${block}\n${body ? `\n${body}\n` : ''}`
}

/**
 * Make sure `file` stays inside the working directory after resolving symlinks and junctions in any part of its path.
 *
 * @param {string} file - Path relative to the working directory.
 * @throws {Error} When the path is invalid or resolves outside of the working directory.
 */
export function assertContained(file) {
  // elrh-cosca validates the path (including symlink resolution) and throws when it escapes the CWD
  pathExists({ targetPath: file })
}

/**
 * Overwrite an existing `file` with `text` after checking it is contained in the working directory.
 *
 * @param {string} file - Path relative to the working directory.
 * @param {string} text - New content of the file.
 */
export async function writeContainedFile(file, text) {
  assertContained(file)
  await fs.writeFile(file, text, 'utf8')
}

/**
 * Download a template from `url`.
 *
 * @param {string} url - URL of the template file.
 * @returns {Promise<string>} Text content of the template.
 */
export async function fetchTemplate(url) {
  const directory = await fs.mkdtemp('.agentcreed-')
  try {
    const templateFile = `${directory}/template.md`
    await createFileFromWebTemplate({ url, targetPath: templateFile, force: true, silent: true })
    return await fs.readFile(templateFile, 'utf8')
  } finally {
    await deletePath({ targetPath: directory, force: true, silent: true })
  }
}

/**
 * Replace the managed block in `original` with the one from `template`, keeping a custom H1 headline,
 * line endings and the content outside the block.
 *
 * @param {string} original - Current text of the file.
 * @param {string} template - Text of the template providing the managed block.
 * @param {boolean} isSkill - Whether the file is a skill, so its frontmatter is taken from the template (defaults to false).
 * @returns {string} Merged text of the file.
 */
export function applyManagedBlock(original, template, isSkill = false) {
  const { bom, ...sections } = getMergeSections(original, template, isSkill)
  const eol = original.includes('\r\n') ? '\r\n' : '\n'
  return bom + composeDocument(sections).replaceAll('\n', eol)
}

/**
 * Offer to merge the AgentCreed command permissions into the settings files of the agent tools picked by the user.
 * Always asks, even in automatic mode. Existing files keep their other settings: objects are merged key by key
 * and arrays get the missing items appended.
 */
export async function setupAgentSettings() {
  showMessage({ message: 'OPTIONAL: AGENT COMMAND PERMISSIONS', linesBefore: 1 })
  showMessage({
    message: 'AgentCreed can configure your agent tools to run reasonably safe commands (e.g. `git status`) without asking. '
      + 'This changes what agents may do without your approval. Other settings in existing files are kept.',
    linesAfter: 1,
  })
  const picked = await promptUser({
    question: 'Select the agent tools to configure:',
    multiChoice: CREED_AGENT_SETTINGS.map(({ label, file }) => `${label} (${file})`),
  })
  if (!picked.length) {
    showDebug('Agent command permissions skipped.')
    return
  }
  for (const { file, paths } of picked.map(number => CREED_AGENT_SETTINGS[number - 1])) {
    const url = `${CREED_FILES_URL}${file}`
    try {
      const template = JSON.parse(await fetchTemplate(url))
      for (const segments of paths) {
        const patch = segments.reduce((value, segment) => value?.[segment], template)
        if (patch === undefined) throw new Error(`Template is missing '${segments.join('.')}'`)
        const jsonKey = segments.map(segment => segment.replaceAll('.', '\\.')).join('.') // escaping due to elrh-cosca key handling
        await updateJsonFile({ targetPath: file, jsonKey, patch, createMissing: true, force: true, silent: true })
      }
      showDebug(`'${file}' permissions updated.`)
    } catch (error) {
      throw new Error(`Could not set up '${file}' from ${url}: ${error.message}`, { cause: error })
    }
  }
}

/**
 * Write the installed AgentCreed version into `CREED_VERSION_FILE`.
 */
export async function writeVersionFile() {
  assertContained(CREED_VERSION_FILE)
  await fs.mkdir(path.dirname(CREED_VERSION_FILE), { recursive: true })
  await writeContainedFile(CREED_VERSION_FILE, `${CREED_VERSION}`)
}

/**
 * Delete `CREED_CHECK_FILE` so the next `creed-scan` or `creed-check` run can skip the clean git workspace check.
 */
export async function removeCheckFile() {
  assertContained(CREED_CHECK_FILE)
  await deletePath({ targetPath: CREED_CHECK_FILE, force: true, silent: true })
}

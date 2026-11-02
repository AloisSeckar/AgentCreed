// Shared helpers for AgentCreed setup and update commands

import fs from 'node:fs/promises'
import path from 'node:path'
import { createFileFromWebTemplate, updateTextFile } from 'elrh-cosca'
import {
  CREED_BLOCK_BEGIN, CREED_BLOCK_END, CREED_SKILLS, CREED_VERSION, CREED_VERSION_FILE,
} from './constants.js'

/** Index of the closing frontmatter line, or -1 when the document has no frontmatter. */
function findFrontmatterEnd(lines) {
  if (!/^---[ \t]*$/.test(lines[0])) return -1
  const closing = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)[ \t]*$/.test(line))
  if (closing === -1) throw new Error('Unterminated skill frontmatter')
  return closing
}

/** Split a document into its header (H1 headline or skill frontmatter, null when absent) and the remaining lines. */
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

/** Range of the single managed block in `lines`, or null when there is none. */
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

/**
 * Sections of the merged document: header, the template block and the user content (everything outside the block).
 * Only a custom H1 headline is kept in front of the block; skill frontmatter always comes from the template.
 */
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

/** Download a template from `url` and return its text. */
export async function fetchTemplate(url) {
  const directory = await fs.mkdtemp('.agentcreed-')
  try {
    const templateFile = `${directory}/template.md`
    await createFileFromWebTemplate({ url, targetFile: templateFile, force: true, silent: true })
    return await fs.readFile(templateFile, 'utf8')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}

/** Replace the managed block in `file` with the one from `template`, keeping a custom H1 headline and the content after the block. */
export async function mergeFile(file, template) {
  const original = await fs.readFile(file, 'utf8')
  const { bom, header, block, body } = getMergeSections(original, template, CREED_SKILLS.includes(file))
  const prefix = bom + header
  const tempFile = file.replace(/\.md$/, '_temp.md')
  let ownsTemp = false
  try {
    const handle = await fs.open(tempFile, 'wx')
    ownsTemp = true
    try {
      await handle.writeFile(`${prefix}\n`, 'utf8')
    } finally {
      await handle.close()
    }
    await updateTextFile({ targetFile: tempFile, rowsToAdd: [block], allowDuplicates: true, force: true, silent: true })
    if (body) await updateTextFile({ targetFile: tempFile, rowsToAdd: [body], allowDuplicates: true, force: true, silent: true })
    const expected = bom + composeDocument({ header, block, body })
    if (await fs.readFile(tempFile, 'utf8') !== expected) {
      throw new Error('Temporary file did not preserve the expected content')
    }
    await fs.rename(tempFile, file)
    console.log(`'${file}' file updated.`)
    ownsTemp = false
  } finally {
    if (ownsTemp) await fs.rm(tempFile, { force: true })
  }
}

/**
 * Same merge as `mergeFile`, returned as text. Keeps the BOM and CRLF line endings of `original`.
 * Skill frontmatter is replaced from the template; content before the block moves after it.
 */
export function applyManagedBlock(original, template, isSkill = false) {
  const { bom, ...sections } = getMergeSections(original, template, isSkill)
  const eol = original.includes('\r\n') ? '\r\n' : '\n'
  return bom + composeDocument(sections).replaceAll('\n', eol)
}

/** Write the installed AgentCreed version into `CREED_VERSION_FILE`. */
export async function writeVersionFile() {
  await fs.mkdir(path.dirname(CREED_VERSION_FILE), { recursive: true })
  await fs.writeFile(CREED_VERSION_FILE, `${CREED_VERSION}`, 'utf8')
}

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

function splitDocument(text, isSkill) {
  const content = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const lines = content.split('\n')
  if (isSkill) {
    const closing = findFrontmatterEnd(lines)
    if (closing === -1) return { prefix: null, body: content }
    return { prefix: lines.slice(0, closing + 1).join('\n'), body: lines.slice(closing + 1).join('\n') }
  }
  if ([CREED_BLOCK_BEGIN, CREED_BLOCK_END].includes(lines[0].trim())) {
    throw new Error('Expected a headline before Agent Creed markers')
  }
  return { prefix: content ? lines[0] : null, body: lines.slice(1).join('\n') }
}

function findManagedBlocks(body) {
  const lines = body.split('\n')
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
  return { lines, blocks }
}

/** Lines from the first opening to the last closing marker of a template. */
function getManagedSpan(managed) {
  if (!managed.blocks.length) throw new Error('Template is missing Agent Creed markers')
  return managed.lines.slice(managed.blocks[0].start, managed.blocks.at(-1).end + 1)
}

function trimBlankLines(text) {
  const lines = text.split('\n')
  let start = 0
  let end = lines.length
  while (start < end && !lines[start].trim()) start++
  while (end > start && !lines[end - 1].trim()) end--
  return lines.slice(start, end).join('\n')
}

function getMergeSections(original, template, isSkill) {
  const source = splitDocument(template, isSkill)
  if (source.prefix === null) throw new Error('Template is missing its headline or skill frontmatter')
  const block = getManagedSpan(findManagedBlocks(source.body)).join('\n')
  const existing = splitDocument(original, isSkill)
  let body = trimBlankLines(existing.body)
  if (body === block || body.startsWith(`${block}\n`)) {
    body = body.slice(block.length)
  }
  const previous = findManagedBlocks(body)
  const remaining = []
  let cursor = 0
  for (const range of previous.blocks) {
    remaining.push(...previous.lines.slice(cursor, range.start))
    cursor = range.end + 1
  }
  remaining.push(...previous.lines.slice(cursor))
  return {
    prefix: (original.startsWith('\uFEFF') ? '\uFEFF' : '') + (existing.prefix ?? source.prefix),
    block,
    body: trimBlankLines(remaining.join('\n')),
  }
}

/** Download a template from `url` and return its text. */
export async function fetchTemplate(url) {
  const directory = await fs.mkdtemp('.agentcreed-')
  try {
    const templateFile = `${directory}/template.md`
    await createFileFromWebTemplate({ url, targetFile: templateFile, force: true })
    return await fs.readFile(templateFile, 'utf8')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}

/** Merge the managed block of `template` into `file`, keeping the headline, frontmatter and unmanaged content. */
export async function mergeFile(file, template) {
  const original = await fs.readFile(file, 'utf8')
  const { prefix, block, body } = getMergeSections(original, template, CREED_SKILLS.includes(file))
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
    await updateTextFile({ targetFile: tempFile, rowsToAdd: [block], allowDuplicates: true, force: true })
    if (body) await updateTextFile({ targetFile: tempFile, rowsToAdd: [body], allowDuplicates: true, force: true })
    const expected = `${prefix}\n\n${block}\n${body ? `\n${body}\n` : ''}`
    if (await fs.readFile(tempFile, 'utf8') !== expected) {
      throw new Error('Temporary file did not preserve the expected content')
    }
    await fs.rename(tempFile, file)
    ownsTemp = false
  } finally {
    if (ownsTemp) await fs.rm(tempFile, { force: true })
  }
}

/**
 * Replace the managed span (first opening to last closing marker) of `original` with the one from `template`.
 * Without markers, the block is inserted after the H1 heading (or at the top, below any skill frontmatter).
 */
export function applyManagedBlock(original, template) {
  const bom = original.startsWith('\uFEFF') ? '\uFEFF' : ''
  const text = original.slice(bom.length)
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const block = getManagedSpan(findManagedBlocks(template.replace(/\r\n/g, '\n')))
  const target = findManagedBlocks(text.replace(/\r\n/g, '\n'))
  let lines
  if (target.blocks.length) {
    lines = [
      ...target.lines.slice(0, target.blocks[0].start),
      ...block,
      ...target.lines.slice(target.blocks.at(-1).end + 1),
    ]
  } else {
    const start = findFrontmatterEnd(target.lines) + 1
    const heading = target.lines.findIndex((line, index) => index >= start && /^# /.test(line))
    const at = heading === -1 ? start : heading + 1
    const before = target.lines.slice(0, at)
    const after = target.lines.slice(at)
    while (after.length && !after[0].trim()) after.shift()
    lines = [...before, ...(before.length ? [''] : []), ...block, ...(after.length ? ['', ...after] : [''])]
  }
  return bom + lines.join(eol)
}

/** Write the installed AgentCreed version into `CREED_VERSION_FILE`. */
export async function writeVersionFile() {
  await fs.mkdir(path.dirname(CREED_VERSION_FILE), { recursive: true })
  await fs.writeFile(CREED_VERSION_FILE, `${CREED_VERSION}`, 'utf8')
}

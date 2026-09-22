#!/usr/bin/env node

import fs from 'node:fs/promises'
import {
  createFileFromWebTemplate, pathExists, promptUser, showMessage, updateTextFile,
} from 'elrh-cosca'
import {
  CREED_BLOCK_END, CREED_FILES, CREED_SKILL_FILE, CREED_BLOCK_BEGIN, REMOTE_CREED_FILES_URL,
} from '../utils/constants.js'

const TARGET_VERSION = '0.0.0'

function splitDocument(text, isSkill) {
  const content = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const lines = content.split('\n')
  if (isSkill) {
    if (!/^---[ \t]*$/.test(lines[0])) return { prefix: null, body: content }
    const closing = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)[ \t]*$/.test(line))
    if (closing === -1) throw new Error('Unterminated skill frontmatter')
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
  const managed = findManagedBlocks(source.body)
  if (!managed.blocks.length) throw new Error('Template is missing Agent Creed markers')
  const block = managed.lines.slice(managed.blocks[0].start, managed.blocks.at(-1).end + 1).join('\n')
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

async function mergeFile(file, template) {
  const original = await fs.readFile(file, 'utf8')
  const { prefix, block, body } = getMergeSections(original, template, file === CREED_SKILL_FILE)
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
    await updateTextFile(tempFile, [block], true)
    if (body) await updateTextFile(tempFile, [body], true)
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
 * Scaffold the root instruction documents and creed-dev skill from GitHub main.
 * Existing headlines, skill metadata and instructions outside managed blocks are preserved.
 * Manual mode requests consent once per file; automatic mode suppresses prompts.
 *
 * @param {boolean} autoRun - Whether to run the setup automatically without any prompts (defaults to false).
 * @returns {Promise<void>} Completes setup and exits on success; rejects on failure.
 */
export async function creedSetup(autoRun = false) {
  showMessage('AGENT CREED SETUP')
  showMessage(`Target version: ${TARGET_VERSION}`)
  showMessage('This CLI tool will help you establishing Agent Creed AI-assisted development in your project.')
  showMessage('Refer to the documentation for more information.', 2)

  const isAutoRun = autoRun || await promptUser('Do you want to set everything up automatically (no more prompts)?')
  showMessage('')

  for (const file of CREED_FILES) {
    if (!isAutoRun && !await promptUser(`Set up '${file}' while preserving your instructions?`)) {
      showMessage(`Setup of '${file}' skipped.`)
      continue
    }
    const url = `${REMOTE_CREED_FILES_URL}${file}`
    try {
      if (pathExists(file)) {
        const templateDirectory = await fs.mkdtemp('.agentcreed-')
        try {
          const templateFile = `${templateDirectory}/template.md`
          await createFileFromWebTemplate(url, templateFile, true)
          await mergeFile(file, await fs.readFile(templateFile, 'utf8'))
        } finally {
          await fs.rm(templateDirectory, { recursive: true, force: true })
        }
      } else {
        await createFileFromWebTemplate(url, file, true)
      }
    } catch (error) {
      throw new Error(`Could not set up '${file}' from ${url}: ${error.message}`, { cause: error })
    }
  }

  // inform user
  showMessage('')
  showMessage('AGENT CREED SETUP COMPLETE', 2)

  // force exit to prevent #20
  process.exit(0)
}
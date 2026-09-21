#!/usr/bin/env node

import fs from 'node:fs/promises'
import https from 'node:https'
import {
  createFileFromWebTemplate, pathExists, promptUser, showMessage, updateTextFile,
} from 'elrh-cosca'

const TARGET_VERSION = '0.0.0'
const TEMPLATE_BASE_URL = 'https://raw.githubusercontent.com/AloisSeckar/AgentCreed/refs/heads/main/src/'
const START_MARKER = '<!-- \u2193\u2193\u2193 agentcreed \u2193\u2193\u2193 -->'
const END_MARKER = '<!-- \u2191\u2191\u2191 agentcreed \u2191\u2191\u2191 -->'
const SKILL_FILE = '.agents/skills/creed-dev/SKILL.md'
const FILES = ['AGENTS.md', 'ARCHITECTURE.md', 'SECURITY.md', SKILL_FILE]

function fetchTemplate(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`Template download returned HTTP ${response.statusCode}`))
        return
      }
      let content = ''
      response.setEncoding('utf8')
      response.on('data', chunk => { content += chunk })
      response.on('end', () => resolve(content))
      response.on('error', reject)
      response.on('aborted', () => reject(new Error('Template download was interrupted')))
    }).on('error', reject)
  })
}

function splitDocument(text, isSkill) {
  const content = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const lines = content.split('\n')
  if (isSkill) {
    if (!/^---[ \t]*$/.test(lines[0])) return { prefix: null, body: content }
    const closing = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)[ \t]*$/.test(line))
    if (closing === -1) throw new Error('Unterminated skill frontmatter')
    return { prefix: lines.slice(0, closing + 1).join('\n'), body: lines.slice(closing + 1).join('\n') }
  }
  if ([START_MARKER, END_MARKER].includes(lines[0].trim())) {
    throw new Error('Expected a headline before Agent Creed markers')
  }
  return { prefix: content ? lines[0] : null, body: lines.slice(1).join('\n') }
}

function findManagedBlocks(body) {
  const lines = body.split('\n')
  const blocks = []
  let opening = -1
  for (const [index, line] of lines.entries()) {
    if (line.trim() === START_MARKER) {
      if (opening !== -1) throw new Error('Nested Agent Creed opening marker')
      opening = index
    } else if (line.trim() === END_MARKER) {
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
  const { prefix, block, body } = getMergeSections(original, template, file === SKILL_FILE)
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
    if (body) await updateTextFile(tempFile, [`${body}\n`], true)
    const expected = `${prefix}\n\n${block}\n${body ? `\n${body}\n\n` : ''}`
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

  for (const file of FILES) {
    if (!isAutoRun && !await promptUser(`Set up '${file}' while preserving your instructions?`)) {
      showMessage(`Setup of '${file}' skipped.`)
      continue
    }
    const url = `${TEMPLATE_BASE_URL}${file}`
    try {
      if (pathExists(file)) {
        await mergeFile(file, await fetchTemplate(url))
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
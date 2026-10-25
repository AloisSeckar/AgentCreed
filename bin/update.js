#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { createFileFromWebTemplate, pathExists, promptUser, showMessage } from 'elrh-cosca'
import { CREED_FILES, CREED_FILES_URL, CREED_VERSION, CREED_VERSION_FILE } from '../utils/constants.js'
import { findManagedBlocks } from './setup.js'

async function fetchTemplate(url) {
  const directory = await fs.mkdtemp('.agentcreed-')
  try {
    const templateFile = `${directory}/template.md`
    await createFileFromWebTemplate({ url, targetFile: templateFile, force: true })
    return await fs.readFile(templateFile, 'utf8')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}

/**
 * Replace the managed span (first opening to last closing marker) of `original` with the one from `template`.
 * Without markers, the block is inserted after the H1 heading (or at the top, below any skill frontmatter).
 */
function applyManagedBlock(original, template) {
  const bom = original.startsWith('\uFEFF') ? '\uFEFF' : ''
  const text = original.slice(bom.length)
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const source = findManagedBlocks(template.replace(/\r\n/g, '\n'))
  if (!source.blocks.length) throw new Error('Template is missing Agent Creed markers')
  const block = source.lines.slice(source.blocks[0].start, source.blocks.at(-1).end + 1)
  const target = findManagedBlocks(text.replace(/\r\n/g, '\n'))
  let lines
  if (target.blocks.length) {
    lines = [
      ...target.lines.slice(0, target.blocks[0].start),
      ...block,
      ...target.lines.slice(target.blocks.at(-1).end + 1),
    ]
  } else {
    let start = 0
    if (/^---[ \t]*$/.test(target.lines[0])) {
      const closing = target.lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)[ \t]*$/.test(line))
      if (closing === -1) throw new Error('Unterminated skill frontmatter')
      start = closing + 1
    }
    const heading = target.lines.findIndex((line, index) => index >= start && /^# /.test(line))
    const at = heading === -1 ? start : heading + 1
    const before = target.lines.slice(0, at)
    const after = target.lines.slice(at)
    while (after.length && !after[0].trim()) after.shift()
    lines = [...before, ...(before.length ? [''] : []), ...block, ...(after.length ? ['', ...after] : [''])]
  }
  return bom + lines.join(eol)
}

/**
 * CLI tool to update Agent Creed managed content in project folder.
 *
 * It first asks whether to run in "auto" mode (no prompts) or "manual" mode (with prompts).
 *
 * Then it:
 *  1) replaces content between Agent Creed markers in each instruction file with the latest from GitHub
 *     (missing files are created from the template, files without markers get the block added after H1)
 *  2) updates the file with installed version
 *
 * @param {boolean} autoRun - Whether to run the update automatically without any prompts (defaults to false).
 */
export async function creedUpdate(autoRun = false) {
  showMessage({ message: 'AGENT CREED UPDATE' })
  showMessage({ message: `CLI version: ${CREED_VERSION}` })
  showMessage({ message: 'This CLI tool will help you update your Agent Creed setup.' })
  showMessage({ message: 'Refer to the documentation for more information.', linesAfter: 2 })

  const isAutoRun = autoRun || await promptUser({ question: 'Do you want to update everything automatically (no more prompts)?' })
  showMessage({ message: '' })

  for (const file of CREED_FILES) {
    if (!isAutoRun && !await promptUser({ question: `Update '${file}'?` })) {
      showMessage({ message: `Update of '${file}' skipped.` })
      continue
    }
    const url = `${CREED_FILES_URL}${file}`
    try {
      if (!pathExists({ targetPath: file })) {
        await createFileFromWebTemplate({ url, targetFile: file, force: true })
        continue
      }
      const template = await fetchTemplate(url)
      const original = await fs.readFile(file, 'utf8')
      const updated = applyManagedBlock(original, template)
      if (updated !== original) await fs.writeFile(file, updated, 'utf8')
    } catch (error) {
      throw new Error(`Could not update '${file}' from ${url}: ${error.message}`, { cause: error })
    }
  }

  // file with version info
  await fs.mkdir(path.dirname(CREED_VERSION_FILE), { recursive: true })
  await fs.writeFile(CREED_VERSION_FILE, `${CREED_VERSION}\n`, 'utf8')

  // inform user
  showMessage({ message: '' })
  showMessage({ message: 'AGENT CREED UPDATE COMPLETE', linesAfter: 2 })

  // force exit to prevent #20
  process.exit(0)
}
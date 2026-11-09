#!/usr/bin/env node

import fs from 'node:fs/promises'
import { createFileFromWebTemplate, pathExists, promptUser, showMessage } from 'elrh-cosca'
import { CREED_FILES, CREED_FILES_URL, CREED_SKILLS } from '../utils/constants.js'
import { applyManagedBlock, fetchTemplate, writeVersionFile } from '../utils/install.js'

/**
 * CLI tool to update Agent Creed managed content in project folder.
 *
 * It first asks whether to run in "auto" mode (no prompts) or "manual" mode (with prompts).
 *
 * Then it:
 *  1) replaces the single Agent Creed block in each instruction file with the latest from GitHub, keeping a custom H1
 *     and the user content after the block (missing files are created from the template, skill metadata is always
 *     replaced, files without a block get it added below the headline)
 *  2) updates the file with installed version
 *
 * @param {boolean} autoRun - Whether to run the update automatically without any prompts (defaults to false).
 */
export async function creedUpdate(autoRun = false) {
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
        await createFileFromWebTemplate({ url, targetPath: file, force: true })
        continue
      }
      const template = await fetchTemplate(url)
      const original = await fs.readFile(file, 'utf8')
      const updated = applyManagedBlock(original, template, CREED_SKILLS.includes(file))
      if (updated !== original) await fs.writeFile(file, updated, 'utf8')
    } catch (error) {
      throw new Error(`Could not update '${file}' from ${url}: ${error.message}`, { cause: error })
    }
  }

  // file with version info
  await writeVersionFile()

  // inform user
  showMessage({ message: '' })
  showMessage({ message: 'UPDATE COMPLETE', linesAfter: 2 })
  showMessage({ message: 'Proceed with running `creed-check` skill via your agent to make sure all instructions are consistent and up-to-date.', linesAfter: 2 })
  
}

#!/usr/bin/env node

import fs from 'node:fs/promises'
import { 
  createFileFromWebTemplate, pathExists, promptUser, 
  showMessage, showDebug, showSuccess 
} from 'elrh-cosca'
import { CREED_FILES, CREED_FILES_URL, CREED_SKILLS } from '../utils/constants.js'
import { applyManagedBlock, fetchTemplate, writeVersionFile } from '../utils/install.js'

/**
 * Update Agent Creed managed content in project folder to the latest released templates.
 *
 * @param {boolean} autoRun - Whether to run the update automatically without any prompts (defaults to false).
 */
export async function creedUpdate(autoRun = false) {
  showMessage({ message: 'This CLI tool will help you update your Agent Creed setup.' })
  showMessage({ message: 'Refer to the documentation for more information.', linesAfter: 1 })

  const isAutoRun = autoRun || await promptUser({ question: 'Do you want to update everything automatically (no more prompts)?', linesAfter: 1 })

  for (const file of CREED_FILES) {
    if (!isAutoRun && !await promptUser({ question: `Update '${file}'?` })) {
      showDebug(`Update of '${file}' skipped.`)
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
  showSuccess({ message: 'UPDATE COMPLETE', linesBefore: 1, linesAfter: 1 })
  showMessage({ message: 'Proceed with running `creed-check` skill via your agent to make sure all instructions are consistent and up-to-date.' })
  
}

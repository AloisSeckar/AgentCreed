#!/usr/bin/env node

import { 
  createFileFromWebTemplate, pathExists, promptUser, 
  showDebug, showMessage, showSuccess 
} from 'elrh-cosca'
import { CREED_FILES, CREED_FILES_URL } from '../utils/constants.js'
import { fetchTemplate, mergeFile, writeVersionFile } from '../utils/install.js'

/**
 * Scaffold the root instruction documents, skills and aux files.
 *
 * @param {boolean} autoRun - Whether to run the setup automatically without any prompts (defaults to false).
 */
export async function creedSetup(autoRun = false) {
  showMessage({ message: 'This CLI tool will help you establishing Agent Creed AI-assisted development in your project.' })
  showMessage({ message: 'Refer to the documentation for more information.', linesAfter: 1 })

  const isAutoRun = autoRun || await promptUser({ question: 'Do you want to set everything up automatically (no more prompts)?', linesAfter: 1 })

  for (const file of CREED_FILES) {
    if (!isAutoRun && !await promptUser({ question: `Set up '${file}' while preserving your instructions?` })) {
      showDebug(`Setup of '${file}' skipped.`)
      continue
    }
    const url = `${CREED_FILES_URL}${file}`
    try {
      if (pathExists({ targetPath: file })) {
        await mergeFile(file, await fetchTemplate(url))
      } else {
        await createFileFromWebTemplate({ url, targetPath: file, force: true })
      }
    } catch (error) {
      throw new Error(`Could not set up '${file}' from ${url}: ${error.message}`, { cause: error })
    }
  }

  // file with version info
  await writeVersionFile()

  // inform user
  showSuccess({ message: 'SETUP COMPLETE', linesBefore: 1, linesAfter: 1 })
  showMessage({ message: 'Proceed with running `creed-scan` skill via your agent to make sure all instructions are consistent and up-to-date.' })

}

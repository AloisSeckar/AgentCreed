#!/usr/bin/env node

import { createFileFromWebTemplate, pathExists, promptUser, showMessage } from 'elrh-cosca'
import { CREED_FILES, CREED_FILES_URL } from '../utils/constants.js'
import { fetchTemplate, mergeFile, writeVersionFile } from '../utils/install.js'

/**
 * Scaffold the root instruction documents, skills and aux files.
 * Existing headlines, skill metadata and instructions outside managed blocks are preserved.
 * Manual mode requests consent once per file; automatic mode suppresses prompts.
 *
 * @param {boolean} autoRun - Whether to run the setup automatically without any prompts (defaults to false).
 * @returns {Promise<void>} Completes setup and exits on success; rejects on failure.
 */
export async function creedSetup(autoRun = false) {
  showMessage({ message: 'This CLI tool will help you establishing Agent Creed AI-assisted development in your project.' })
  showMessage({ message: 'Refer to the documentation for more information.', linesAfter: 2 })

  const isAutoRun = autoRun || await promptUser({ question: 'Do you want to set everything up automatically (no more prompts)?' })
  showMessage({ message: '' })

  for (const file of CREED_FILES) {
    if (!isAutoRun && !await promptUser({ question: `Set up '${file}' while preserving your instructions?` })) {
      showMessage({ message: `Setup of '${file}' skipped.` })
      continue
    }
    const url = `${CREED_FILES_URL}${file}`
    try {
      if (pathExists({ targetPath: file })) {
        await mergeFile(file, await fetchTemplate(url))
      } else {
        await createFileFromWebTemplate({ url, targetFile: file, force: true })
      }
    } catch (error) {
      throw new Error(`Could not set up '${file}' from ${url}: ${error.message}`, { cause: error })
    }
  }

  // file with version info
  await writeVersionFile()
  
  showMessage({ message: 'SETUP COMPLETE', linesAfter: 2 })
}

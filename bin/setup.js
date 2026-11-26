#!/usr/bin/env node

import fs from 'node:fs/promises'
import { 
  createFileFromWebTemplate, pathExists, promptUser, 
  showDebug, showMessage, showSuccess,
} from 'elrh-cosca'
import { CREED_FILES, CREED_FILES_URL, CREED_SKILLS, CREED_VERSION_FILE } from './utils/constants.js'
import { 
  applyManagedBlock, fetchTemplate, removeCheckFile, setupAgentSettings, writeContainedFile, writeVersionFile,
} from './utils/install.js'

/**
 * Scaffold or update the root instruction documents, skills and aux files.
 *
 * @param {boolean} autoRun - Whether to run the setup automatically without any prompts (defaults to false).
 */
export async function creedSetup(autoRun = false) {
  showMessage({ message: 'This CLI tool will help you establishing Agent Creed AI-assisted development in your project.' })
  showMessage({ message: 'Refer to the documentation for more information.', linesAfter: 1 })

  const isAutoRun = autoRun || await promptUser({ question: 'Do you want to set everything up automatically (no individual prompts)?', linesAfter: 1 })

  for (const file of CREED_FILES) {
    if (!isAutoRun && !await promptUser({ question: `Set up '${file}' while preserving your instructions?` })) {
      showDebug(`Setup of '${file}' skipped.`)
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
      if (updated === original) {
        showDebug(`'${file}' file already up to date.`)
      } else {
        await writeContainedFile(file, updated)
        showDebug(`'${file}' file updated.`)
      }
    } catch (error) {
      throw new Error(`Could not set up '${file}' from ${url}: ${error.message}`, { cause: error })
    }
  }

  // always prompts, even in automatic mode
  await setupAgentSettings()

  // .creed folder adjustments
  const isUpdate = pathExists({ targetPath: CREED_VERSION_FILE })
  await writeVersionFile()
  await removeCheckFile()

  // inform user
  const nextSkill = isUpdate ? 'creed-check' : 'creed-scan'
  showSuccess({ message: 'SETUP COMPLETE', linesBefore: 1, linesAfter: 1 })
  showMessage({ message: `Proceed with running \`${nextSkill}\` skill via your agent to make sure all instructions are consistent and up-to-date.` })

}

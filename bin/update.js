#!/usr/bin/env node

import {
    promptUser, showMessage,
} from 'elrh-cosca'

const TARGET_VERSION = '0.0.0'

/**
 * CLI tool to scaffold necessary adjustments in project folder.
 *
 * It first asks whether to run in "auto" mode (no prompts, force = true) or "manual" mode (with prompts, force = false).
 *
 * Then it:
 *  1) TODO
 *
 * @param {boolean} autoRun - Whether to run the setup automatically without any prompts (defaults to false).
 */
export async function creedUpdate(autoRun = false) {
  showMessage({ message: 'AGENT CREED UPDATE' })
  showMessage({ message: `Target version: ${TARGET_VERSION}` })
  showMessage({ message: 'This CLI tool will help you update your Agent Creed setup.' })
  showMessage({ message: 'Refer to the documentation for more information.', linesAfter: 2 })

  const isAutoRun = autoRun || await promptUser({ question: 'Do you want to set everything up automatically (no more prompts)?' })
  showMessage({ message: '' })

  // 1) TODO

  // steps required to set up the project

  // inform user
  showMessage({ message: '' })
  showMessage({ message: 'AGENT CREED UPDATE COMPLETE', linesAfter: 2 })

  // force exit to prevent #20
  process.exit(0)
}
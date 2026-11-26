#!/usr/bin/env node

/**
 * CLI tool to make necessary adjustments in target project folder.
 */

import { 
  getPackageManager, showMessage, showError, 
  showDebug, showSuccess, showWarning,
} from 'elrh-cosca'
import { CREED_VERSION } from './utils/constants.js'

// get parameters passed by user
const args = process.argv.slice(2); // semicolon required

// execute actions based on first param
// additional params might be passed into the called functions
(async () => {
  let status = 0
  const autoRun = args[1] === 'true'
  try {
    showMessage({ message: '========================================', color: 'yellow' })
    showDebug({ message: `CLI version: ${CREED_VERSION}`, linesAfter: 1 })
    showSuccess({ message: 'AGENT CREED CLI', linesAfter: 1 })

    switch (args[0]) {
      case 'update':
        showWarning({
          message: 'WARNING: Deprecated for removal\nUse `setup` for both setup and update functionality.',
          linesAfter: 1,
        })
        // falls through
      case 'setup':
        await (await import('./setup.js')).creedSetup(autoRun)
        break
      default:
        showError(`[agentcreed] Usage: \`${getPackageManager()} agentcreed setup|update [true|false]\``)
        status = 1
    }
    
    showSuccess({ message: 'AGENT CREED CLI FINISHED', linesBefore: 1, linesAfter: 1 })
    showDebug({ message: `CLI version: ${CREED_VERSION}` })
    showMessage({ message: '========================================', linesAfter: 1, color: 'yellow' })
  } catch (error) {
    showError(`[agentcreed] CLI failed: ${error.message}`)
    showDebug(error.stack)
    status = 1
  }
  process.exit(status)
})()

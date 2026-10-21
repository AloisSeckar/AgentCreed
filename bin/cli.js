#!/usr/bin/env node

import { getPackageManager } from 'elrh-cosca'

/**
 * CLI tool to make necessary adjustments in target project folder.
 */

// get parameters passed by user
const args = process.argv.slice(2);

// execute actions based on first param
// additional params might be passed into the called functions
(async () => {
  let status = 0
  const autoRun = args[1] === 'true'
  try {
    switch (args[0]) {  
      case 'setup':
        await (await import('./setup.js')).creedSetup(autoRun)
        break
      case 'update':
        await (await import('./update.js')).creedUpdate(autoRun)
        break
      default:
        console.log(`[agentcreed] Usage: \`${getPackageManager()} agentcreed setup|update [true|false]\``)
        status = 1
    }
  } catch (error) {
    console.error('[agentcreed] CLI failed:', error.message)
    status = 1
  }
  process.exit(status)
})()

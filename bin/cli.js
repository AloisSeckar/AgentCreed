#!/usr/bin/env node

import { getPackageManager } from 'elrh-cosca'

/**
 * CLI tool to make necessary adjustments in target project folder.
 */

// get parameters passed by user
// TODO no parms processing yet
const args = process.argv.slice(2);

// execute actions based on first param
// additional params might be passed into the called functions
(async () => {
  let status = 0
  try {
    switch (args[0]) {
      /*  
      case 'setup':
        await (await import('./setup.js')).specSetup(args[1] || false)
        break
      case 'update':
        await (await import('./update.js')).specUpdate(args[1] || false)
        break
      */
      default:
        console.log(`[agentcreed] Usage: \`${getPackageManager()} agentcreed`)
        console.log(`[agentcreed] Demo script was executed`)
        status = 1
    }
  } catch (error) {
    console.error('[agentcreed] CLI failed:', error.message)
    status = 1
  }
  process.exit(status)
})()

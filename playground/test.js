#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const playgroundDir = dirname(fileURLToPath(import.meta.url))
const cliScript = resolve(playgroundDir, '../bin/cli.js')

const command = process.argv[2]
if (!['setup', 'update'].includes(command)) {
  console.error('Usage: node test.js <setup|update>')
  process.exit(1)
}

// test command on empty repo
process.chdir(join(playgroundDir, 'void'))
execFileSync(process.execPath, [cliScript, command, true], { stdio: 'inherit' })

// test command on existing repo
process.chdir(join(playgroundDir, 'established'))
execFileSync(process.execPath, [cliScript, command, true], { stdio: 'inherit' })

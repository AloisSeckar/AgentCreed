#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const playgroundDir = dirname(fileURLToPath(import.meta.url))
const setupScript = resolve(playgroundDir, '../bin/setup.js')

process.chdir(join(playgroundDir, 'void'))
execFileSync(process.execPath, [setupScript], { stdio: 'inherit' })

process.chdir(join(playgroundDir, 'established'))
execFileSync(process.execPath, [setupScript], { stdio: 'inherit' })

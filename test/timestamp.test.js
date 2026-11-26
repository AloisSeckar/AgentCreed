import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const json = file => JSON.parse(read(file))

test('local timestamp commands match the shipped agent permissions', () => {
  const unix = 'date +%Y-%m-%dT%H:%M:%S%z'
  const powershell = 'Get-Date -Format o'
  const skill = read('src/.agents/skills/creed-check/SKILL.md')

  expect(skill).toContain('current local timestamp in ISO 8601 format with a numeric UTC offset')
  expect(skill).toContain(`\`${unix}\``)
  expect(skill).toContain(`\`${powershell}\``)
  for (const file of ['src/.vscode/settings.json', '.vscode/settings.json']) {
    const approvals = json(file)['chat.tools.terminal.autoApprove']
    expect(approvals[unix]).toBe(true)
    expect(approvals[powershell]).toBe(true)
  }
  const claude = json('src/.claude/settings.json').permissions.allow
  const gemini = json('src/.gemini/settings.json').tools.allowed
  const cursor = json('src/.cursor/cli.json').permissions.allow
  for (const command of [unix, powershell]) {
    expect(claude).toContain(`Bash(${command})`)
    expect(gemini).toContain(`run_shell_command(${command})`)
    expect(cursor).toContain(`Shell(${command.replace(' ', ':')})`)
  }
})

import { spawnSync } from 'node:child_process'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
import path from 'node:path'
import { expect, test, vi } from 'vitest'
import { creedSetup } from '../bin/setup.js'
import {
  CREED_AGENT_SETTINGS, CREED_BLOCK_BEGIN, CREED_BLOCK_END, CREED_FILES, CREED_FILES_URL, CREED_SKILLS,
  CREED_BACKLOG_FILE, CREED_SUGGESTIONS_FILE, CREED_VERSION, CREED_VERSION_FILE,
} from '../bin/utils/constants.js'
import {
  METADATA, SETTINGS_TEMPLATES, acceptSettings, block, declineSettings, linkOutside, setupFixture, templateUrl,
} from './helpers.js'

const BLOCK = block('Keep this instruction.')

test('preserves duplicate and one-line instructions through real helper calls and repeat runs', async () => {
  await setupFixture(declineSettings(2))
  const body = 'Keep this instruction.\n\n\n  Preserve indentation.  \nKeep this instruction.'
  await fs.writeFile('AGENTS.md', `# My agents\n\n${body}`)
  await fs.writeFile('ARCHITECTURE.md', '# My architecture\nKeep this instruction.')
  await creedSetup(true)
  const agents = await fs.readFile('AGENTS.md', 'utf8')
  const architecture = await fs.readFile('ARCHITECTURE.md', 'utf8')
  expect(agents).toMatchSnapshot()
  expect(architecture).toMatchSnapshot()
  await creedSetup(true)
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(agents)
  expect(await fs.readFile('ARCHITECTURE.md', 'utf8')).toBe(architecture)
  await expect(fs.access('AGENTS_temp.md')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('scaffolds all full templates from the pinned release tag in order without prompting', async () => {
  const { templates, requests, prompts, exit } = await setupFixture(declineSettings())
  await creedSetup(true)
  expect(requests).toEqual(CREED_FILES.map(templateUrl))
  expect(prompts.length).toBe(1)
  expect(exit.mock.calls).toEqual([])
  for (const file of CREED_FILES) {
    expect(await fs.readFile(file, 'utf8')).toBe(templates.get(templateUrl(file)))
    await expect(fs.access(file.replace(/\.md$/, '_temp.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  }
})

test('writes the CLI version to the version file on every run', async () => {
  await setupFixture(declineSettings(2))
  await creedSetup(true)
  expect(await fs.readFile(CREED_VERSION_FILE, 'utf8')).toBe(CREED_VERSION)
  await fs.writeFile(CREED_VERSION_FILE, 'stale')
  await creedSetup(true)
  expect(await fs.readFile(CREED_VERSION_FILE, 'utf8')).toBe(CREED_VERSION)
})

test('refuses to write the version file through a symlinked .creed directory', async ({ skip }) => {
  await setupFixture(['n', ...CREED_FILES.map(() => 'n'), ...declineSettings()])
  const link = await linkOutside('.creed')
  if (!link) skip()
  await expect(creedSetup()).rejects.toThrow(/outside of CWD via symlink/)
  expect(await fs.readdir(link.outside)).toEqual([])
})

test('refuses to merge managed files behind a symlinked directory pointing outside the project', async ({ skip }) => {
  await setupFixture()
  const link = await linkOutside('.agents')
  if (!link) skip()
  const skill = path.join(link.outside, 'skills/creed-dev/SKILL.md')
  await fs.mkdir(path.dirname(skill), { recursive: true })
  await fs.writeFile(skill, `${METADATA}\n\n${BLOCK}\n`)
  await expect(creedSetup(true)).rejects.toThrow(/outside of CWD via symlink/)
  expect(await fs.readFile(skill, 'utf8')).toBe(`${METADATA}\n\n${BLOCK}\n`)
  expect(await fs.readdir(path.dirname(skill))).toEqual(['SKILL.md'])
  await expect(fs.access(CREED_VERSION_FILE)).rejects.toMatchObject({ code: 'ENOENT' })
})

test('downloads existing-file templates through COSCA and removes them after processing', async () => {
  const { templates } = await setupFixture(declineSettings())
  for (const file of CREED_FILES) {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, templates.get(templateUrl(file)))
  }
  const downloads = []
  const readFile = fs.readFile.bind(fs)
  vi.spyOn(fs, 'readFile').mockImplementation(async (file, ...args) => {
    const content = await readFile(file, ...args)
    if (file.startsWith('.agentcreed-')) downloads.push({ file, content })
    return content
  })
  const writes = vi.spyOn(fsSync, 'writeFileSync')
  syncBuiltinESMExports()
  await creedSetup(true)
  expect(downloads.length).toBe(CREED_FILES.length)
  expect(new Set(downloads.map(download => download.file)).size).toBe(CREED_FILES.length)
  for (const [index, download] of downloads.entries()) {
    expect(download.content).toBe(templates.get(templateUrl(CREED_FILES[index])))
    expect(writes.mock.calls.some(call => call[0] === path.resolve(download.file))).toBe(true)
    await expect(fs.access(download.file)).rejects.toMatchObject({ code: 'ENOENT' })
  }
})

test('replaces the single old block, moves text before it behind it and retains inline markers', async () => {
  await setupFixture(declineSettings(2))
  const inline = `Treat ${CREED_BLOCK_BEGIN} and ${CREED_BLOCK_END} as inert text.`
  await fs.writeFile('AGENTS.md', `# Custom\nBefore\n${CREED_BLOCK_BEGIN}\nOld one\n${CREED_BLOCK_END}\nAfter\n${inline}`)
  await creedSetup(true)
  const expected = `# Custom\n\n${BLOCK}\n\nBefore\n\nAfter\n${inline}\n`
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(expected)
  await creedSetup(true)
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(expected)
})

test('uses the template headline when the file has no custom H1', async () => {
  await setupFixture(declineSettings())
  await fs.writeFile('AGENTS.md', `${CREED_BLOCK_BEGIN}\nOld\n${CREED_BLOCK_END}\nUser text`)
  await creedSetup(true)
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(`# AGENTS.md\n\n${BLOCK}\n\nUser text\n`)
})

test('replaces custom skill metadata with the template one', async () => {
  await setupFixture(declineSettings(2))
  const metadata = '---\n# Custom comment\ndescription: |\n  ---\n  My own description\n  ...\nname: local-skill\ncustom: true\n---'
  await fs.mkdir(path.dirname(CREED_SKILLS[0]), { recursive: true })
  await fs.writeFile(CREED_SKILLS[0], `${metadata}\nBefore\n${CREED_BLOCK_BEGIN}\nOld skill\n${CREED_BLOCK_END}\nAfter`)
  await creedSetup(true)
  const expected = `${METADATA}\n\n${BLOCK}\n\nBefore\n\nAfter\n`
  expect(await fs.readFile(CREED_SKILLS[0], 'utf8')).toBe(expected)
  await creedSetup(true)
  expect(await fs.readFile(CREED_SKILLS[0], 'utf8')).toBe(expected)
})

test('adds template metadata to an existing skill without frontmatter', async () => {
  await setupFixture(declineSettings())
  await fs.mkdir(path.dirname(CREED_SKILLS[0]), { recursive: true })
  await fs.writeFile(CREED_SKILLS[0], '# Local skill\n\nKeep this instruction.')
  await creedSetup(true)
  expect(await fs.readFile(CREED_SKILLS[0], 'utf8')).toMatchSnapshot()
})

test('handles empty files, literal first lines, CRLF, BOM and absent final newlines', async () => {
  const { templates } = await setupFixture(declineSettings(2))
  templates.set(`${CREED_FILES_URL}SECURITY.md`, templates.get(`${CREED_FILES_URL}SECURITY.md`).replaceAll('\n', '\r\n'))
  await fs.writeFile('AGENTS.md', '')
  await fs.writeFile('ARCHITECTURE.md', 'A literal first line')
  await fs.writeFile('SECURITY.md', '\uFEFF# Security\r\n\r\n  Keep spacing.  \r\n\r\nSecond line')
  await creedSetup(true)
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(`# AGENTS.md\n\n${BLOCK}\n`)
  expect(await fs.readFile('ARCHITECTURE.md', 'utf8')).toBe(`# ARCHITECTURE.md\n\n${BLOCK}\n\nA literal first line\n`)
  const expected = await fs.readFile('SECURITY.md', 'utf8')
  expect(expected).toBe(`\uFEFF# Security\n\n${BLOCK}\n\n  Keep spacing.  \n\nSecond line\n`)
  await creedSetup(true)
  expect(await fs.readFile('SECURITY.md', 'utf8')).toBe(expected)
})

test('manual mode asks once per destination and leaves declined existing and missing files alone', async () => {
  const { requests, prompts } = await setupFixture(['n', 'n', 'y', 'n', 'n', 'n', 'y', 'n', 'n', 'n', 'n', ...declineSettings()])
  await fs.writeFile('AGENTS.md', '# Untouched\nMy instructions')
  await fs.writeFile('ARCHITECTURE.md', '# Custom architecture\nUser body')
  await creedSetup()
  expect(prompts.length).toBe(CREED_FILES.length + 2)
  for (const [index, file] of CREED_FILES.entries()) expect(prompts[index + 1]).toContain(file)
  expect(requests).toEqual([`${CREED_FILES_URL}ARCHITECTURE.md`, `${CREED_FILES_URL}${CREED_SKILLS[0]}`])
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe('# Untouched\nMy instructions')
  expect(await fs.readFile('ARCHITECTURE.md', 'utf8')).toMatchSnapshot()
  await expect(fs.access('SECURITY.md')).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(fs.access('AGENTS_temp.md')).rejects.toMatchObject({ code: 'ENOENT' })
})

for (const file of [CREED_SUGGESTIONS_FILE, CREED_BACKLOG_FILE]) {
  test(`merges an existing ${file} and preserves its entries on reruns`, async () => {
    await setupFixture(declineSettings(2))
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, '# My items\n- Existing entry')
    await creedSetup(true)
    const merged = await fs.readFile(file, 'utf8')
    expect(merged).toBe(`# My items\n\n${BLOCK}\n\n- Existing entry\n`)
    await creedSetup(true)
    expect(await fs.readFile(file, 'utf8')).toBe(merged)
  })
}

test('choosing automatic setup at the initial prompt suppresses per-file prompts', async () => {
  const { prompts, requests } = await setupFixture(['yes', ...declineSettings()])
  await creedSetup()
  expect(prompts.length).toBe(2)
  expect(requests.length).toBe(CREED_FILES.length)
})

for (const [label, original, template, message] of [
  ['orphan opening', `# Custom\n${CREED_BLOCK_BEGIN}\nUser text`, null, /without a closing marker/],
  ['orphan closing', `# Custom\n${CREED_BLOCK_END}`, null, /without an opening marker/],
  ['reversed markers', `# Custom\n${CREED_BLOCK_END}\n${CREED_BLOCK_BEGIN}`, null, /without an opening marker/],
  ['nested markers', `# Custom\n${CREED_BLOCK_BEGIN}\n${CREED_BLOCK_BEGIN}\n${CREED_BLOCK_END}\n${CREED_BLOCK_END}`, null, /Nested/],
  ['multiple blocks', `# Custom\n${BLOCK}\nUser text\n${BLOCK}`, null, /single Agent Creed block/],
  ['multiple template blocks', '# Custom\nUser text', `# Template\n${BLOCK}\nMiddle\n${BLOCK}`, /single Agent Creed block/],
  ['unmarked template', '# Custom\nUser text', '# Template\nNo markers', /missing Agent Creed markers/],
  ['unclosed template', '# Custom\nUser text', `# Template\n${CREED_BLOCK_BEGIN}\nNew text`, /without a closing marker/],
]) {
  test(`rejects ${label} without replacing the original`, async () => {
    const { templates, output, exit } = await setupFixture()
    if (template !== null) templates.set(`${CREED_FILES_URL}AGENTS.md`, template)
    await fs.writeFile('AGENTS.md', original)
    await expect(creedSetup(true)).rejects.toThrow(message)
    expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(original)
    await expect(fs.access('AGENTS_temp.md')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(exit.mock.calls.length).toBe(0)
    expect(output.join('')).not.toContain('SETUP COMPLETE')
  })
}

test('rejects unterminated skill frontmatter without changing the skill', async () => {
  await setupFixture()
  const original = '---\nname: unfinished\nMy instructions'
  await fs.mkdir(path.dirname(CREED_SKILLS[0]), { recursive: true })
  await fs.writeFile(CREED_SKILLS[0], original)
  await expect(creedSetup(true)).rejects.toThrow(/Unterminated skill frontmatter/)
  expect(await fs.readFile(CREED_SKILLS[0], 'utf8')).toBe(original)
  await expect(fs.access(CREED_SKILLS[0].replace('.md', '_temp.md'))).rejects.toMatchObject({ code: 'ENOENT' })
})

for (const exists of [false, true]) {
  for (const failure of ['HTTP', 'network']) {
    test(`reports ${failure} failure for an ${exists ? 'existing' : 'absent'} file without fallback`, async () => {
      const { templates, requests, output } = await setupFixture()
      if (failure === 'HTTP') templates.delete(`${CREED_FILES_URL}AGENTS.md`)
      else templates.set(`${CREED_FILES_URL}AGENTS.md`, new Error('Network unavailable'))
      if (exists) await fs.writeFile('AGENTS.md', '# Original\nUntouched')
      await expect(creedSetup(true)).rejects.toThrow(/Could not set up 'AGENTS.md'.*(404|Network unavailable)/s)
      if (exists) expect(await fs.readFile('AGENTS.md', 'utf8')).toBe('# Original\nUntouched')
      else await expect(fs.access('AGENTS.md')).rejects.toMatchObject({ code: 'ENOENT' })
      expect(requests).toEqual([`${CREED_FILES_URL}AGENTS.md`])
      expect(output.join('')).not.toContain('SETUP COMPLETE')
      await expect(fs.access('AGENTS_temp.md')).rejects.toMatchObject({ code: 'ENOENT' })
    })
  }
}

test('refuses to overwrite or remove a pre-existing temp file', async () => {
  await setupFixture()
  await fs.writeFile('AGENTS.md', '# Original\nUntouched')
  await fs.writeFile('AGENTS_temp.md', 'Unrelated temp content')
  await expect(creedSetup(true)).rejects.toThrow(/EEXIST/)
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe('# Original\nUntouched')
  expect(await fs.readFile('AGENTS_temp.md', 'utf8')).toBe('Unrelated temp content')
})

for (const failure of ['download write', 'download read', 'prefix write', 'append', 'verification', 'rename']) {
  test(`preserves the original and cleans its temp after a ${failure} failure`, async () => {
    await setupFixture()
    await fs.writeFile('AGENTS.md', '# Original\nUntouched')
    if (failure === 'download write') {
      const writeFile = fsSync.writeFileSync.bind(fsSync)
      vi.spyOn(fsSync, 'writeFileSync').mockImplementation((file) => {
        writeFile(file, 'Partial download')
        throw new Error('Download write failed')
      })
      syncBuiltinESMExports()
    } else if (failure === 'download read') {
      const readFile = fs.readFile.bind(fs)
      vi.spyOn(fs, 'readFile').mockImplementation((file, ...args) => file.startsWith('.agentcreed-')
        ? Promise.reject(new Error('Download read failed')) : readFile(file, ...args))
    } else if (failure === 'prefix write') {
      const open = fs.open.bind(fs)
      vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
        const handle = await open(...args)
        vi.spyOn(handle, 'writeFile').mockImplementation(async () => { throw new Error('Write failed') })
        return handle
      })
    } else if (failure === 'append') {
      const writeFile = fsSync.writeFileSync.bind(fsSync)
      vi.spyOn(fsSync, 'writeFileSync').mockImplementation((file, ...args) => {
        if (file.endsWith('_temp.md')) throw new Error('Append failed')
        return writeFile(file, ...args)
      })
      syncBuiltinESMExports()
    } else if (failure === 'verification') {
      const readFile = fs.readFile.bind(fs)
      vi.spyOn(fs, 'readFile').mockImplementation((file, ...args) => file.endsWith('_temp.md')
        ? Promise.resolve('Unexpected staged content') : readFile(file, ...args))
    } else {
      vi.spyOn(fs, 'rename').mockImplementation(async () => { throw new Error('Rename failed') })
    }
    await expect(creedSetup(true)).rejects.toThrow(/Download (write|read) failed|Write failed|Append failed|expected content|Rename failed/)
    expect(await fs.readFile('AGENTS.md', 'utf8')).toBe('# Original\nUntouched')
    await expect(fs.access('AGENTS_temp.md')).rejects.toMatchObject({ code: 'ENOENT' })
  })
}

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'))

test('asks once which agent tools to configure even in automatic mode and creates all picked files', async () => {
  const { prompts, requests, output } = await setupFixture(acceptSettings())
  await creedSetup(true)
  expect(prompts.length).toBe(1)
  for (const { file } of CREED_AGENT_SETTINGS) {
    expect(output.join('')).toContain(file)
    expect(await readJson(file)).toEqual(SETTINGS_TEMPLATES[file])
  }
  expect(requests.slice(CREED_FILES.length)).toEqual(CREED_AGENT_SETTINGS.map(({ file }) => templateUrl(file)))
  expect(Object.keys(await readJson('.vscode/settings.json'))).toEqual(['chat.tools.terminal.autoApprove'])
})

test('creates only the picked agent permission files', async () => {
  const { requests } = await setupFixture(['2'])
  await creedSetup(true)
  expect(await readJson('.claude/settings.json')).toEqual(SETTINGS_TEMPLATES['.claude/settings.json'])
  for (const file of ['.vscode/settings.json', '.gemini/settings.json', '.cursor/cli.json']) {
    await expect(fs.access(file)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  expect(requests.slice(CREED_FILES.length)).toEqual([templateUrl('.claude/settings.json')])
})

test('accepts comma or space separated picks and ignores duplicates', async () => {
  const { requests } = await setupFixture(['4 ,1,4'])
  await creedSetup(true)
  expect(requests.slice(CREED_FILES.length)).toEqual([templateUrl('.vscode/settings.json'), templateUrl('.cursor/cli.json')])
})

test('asks again after an invalid pick and picks nothing on an empty answer', async () => {
  const { prompts, requests, output } = await setupFixture(['x', '9', '0', ''])
  await creedSetup(true)
  expect(prompts.length).toBe(4)
  expect(output.join('')).toContain("Invalid choice 'x'")
  expect(requests.length).toBe(CREED_FILES.length)
  for (const { file } of CREED_AGENT_SETTINGS) await expect(fs.access(file)).rejects.toMatchObject({ code: 'ENOENT' })
})

test('merges agent permissions into existing files without dropping other settings', async () => {
  await setupFixture(acceptSettings(2))
  await fs.mkdir('.vscode', { recursive: true })
  await fs.mkdir('.claude', { recursive: true })
  await fs.writeFile('.vscode/settings.json', JSON.stringify({
    'editor.tabSize': 2,
    'chat.tools.terminal.autoApprove': { 'npm test': true, 'git status': false },
  }))
  await fs.writeFile('.claude/settings.json', JSON.stringify({
    model: 'custom',
    permissions: { defaultMode: 'plan', allow: ['Bash(npm test)'] },
  }))
  await creedSetup(true)
  const expectedVsCode = {
    'editor.tabSize': 2,
    'chat.tools.terminal.autoApprove': { 'npm test': true, 'git status': true, 'git stash drop': false },
  }
  const expectedClaude = {
    model: 'custom',
    permissions: { defaultMode: 'plan', allow: ['Bash(npm test)', 'Bash(git status)'], ask: ['Bash(git stash drop)'] },
  }
  expect(await readJson('.vscode/settings.json')).toEqual(expectedVsCode)
  expect(await readJson('.claude/settings.json')).toEqual(expectedClaude)
  await creedSetup(true)
  expect(await readJson('.vscode/settings.json')).toEqual(expectedVsCode)
  expect(await readJson('.claude/settings.json')).toEqual(expectedClaude)
})

test('stops on an existing agent permission file that is not valid JSON and leaves it untouched', async () => {
  const { output } = await setupFixture(acceptSettings())
  const original = '{\n  "editor.tabSize": 2,\n'
  await fs.mkdir('.vscode', { recursive: true })
  await fs.writeFile('.vscode/settings.json', original)
  await expect(creedSetup(true)).rejects.toThrow(/Could not set up '\.vscode\/settings\.json'/)
  expect(await fs.readFile('.vscode/settings.json', 'utf8')).toBe(original)
  await expect(fs.access(CREED_VERSION_FILE)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(output.join('')).not.toContain('SETUP COMPLETE')
})

test('refuses to write agent permissions through a symlinked directory pointing outside the project', async ({ skip }) => {
  await setupFixture(acceptSettings())
  const link = await linkOutside('.vscode')
  if (!link) skip()
  await expect(creedSetup(true)).rejects.toThrow(/outside of CWD via symlink/)
  expect(await fs.readdir(link.outside)).toEqual([])
})

test('the CLI reports setup failures and exits nonzero', async () => {
  await setupFixture()
  const cli = new URL('../bin/cli.js', import.meta.url).href
  const script = `
    import https from 'node:https'
    import { EventEmitter } from 'node:events'
    https.get = () => {
      const request = new EventEmitter()
      queueMicrotask(() => request.emit('error', new Error('Offline test')))
      return request
    }
    process.argv = ['node', 'cli.js', 'setup', 'true']
    await import(${JSON.stringify(cli)})
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', timeout: 10000,
  })
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(1)
  expect(result.stderr).toMatch(/CLI failed:.*AGENTS\.md.*Offline test/s)
  expect(result.stdout).not.toContain('SETUP COMPLETE')
})
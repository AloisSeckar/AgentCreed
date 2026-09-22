import { spawnSync } from 'node:child_process'
import { EventEmitter } from 'node:events'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { Readable } from 'node:stream'
import { expect, onTestFinished, test, vi } from 'vitest'
import { creedSetup } from '../bin/setup.js'
import {
  CREED_BLOCK_END, CREED_FILES, CREED_SKILL_FILE, CREED_BLOCK_BEGIN, REMOTE_CREED_FILES_URL,
} from '../utils/constants.js'

const METADATA = '---\nname: creed-dev\ndescription: Template skill\n---'
const BLOCK = `${CREED_BLOCK_BEGIN}\n\nKeep this instruction.\n\n${CREED_BLOCK_END}`

async function setupFixture(answers = []) {
  const cwd = process.cwd()
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentcreed-test-'))
  process.chdir(directory)
  onTestFinished(async () => {
    vi.restoreAllMocks()
    syncBuiltinESMExports()
    try {
      expect((await fs.readdir(directory)).filter(name => name.startsWith('.agentcreed-'))).toEqual([])
    } finally {
      process.chdir(cwd)
      await fs.rm(directory, { recursive: true, force: true })
    }
  })
  const templates = new Map(CREED_FILES.map(file => [
    `${REMOTE_CREED_FILES_URL}${file}`, `${file === CREED_SKILL_FILE ? METADATA : `# ${file}`}\n\n${BLOCK}\n`,
  ]))
  const requests = []
  vi.spyOn(https, 'get').mockImplementation((url, callback) => {
    requests.push(url)
    const request = new EventEmitter()
    queueMicrotask(() => {
      if (templates.get(url) instanceof Error) {
        request.emit('error', templates.get(url))
        return
      }
      const response = Readable.from([Buffer.from(templates.get(url) ?? '')])
      response.statusCode = templates.has(url) ? 200 : 404
      callback(response)
    })
    return request
  })
  const prompts = []
  vi.spyOn(readline, 'createInterface').mockImplementation(() => {
    const terminal = new EventEmitter()
    terminal.close = () => {}
    terminal.question = (question, callback) => {
      prompts.push(question)
      expect(answers.length, `Unexpected prompt: ${question}`).toBeGreaterThan(0)
      queueMicrotask(() => callback(answers.shift()))
    }
    return terminal
  })
  const output = []
  vi.spyOn(process.stdout, 'write').mockImplementation(message => {
    output.push(String(message))
    return true
  })
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {})
  return { templates, requests, prompts, output, exit }
}

test('preserves duplicate and one-line instructions through real helper calls and repeat runs', async () => {
  await setupFixture()
  const body = 'Keep this instruction.\n\n\n  Preserve indentation.  \nKeep this instruction.'
  await fs.writeFile('AGENTS.md', `# My agents\n\n${body}`)
  await fs.writeFile('ARCHITECTURE.md', '# My architecture\nKeep this instruction.')
  await creedSetup(true)
  const agents = await fs.readFile('AGENTS.md', 'utf8')
  const architecture = await fs.readFile('ARCHITECTURE.md', 'utf8')
  expect(agents).toBe(`# My agents\n\n${BLOCK}\n\n${body}\n\n`)
  expect(architecture).toBe(`# My architecture\n\n${BLOCK}\n\nKeep this instruction.\n\n`)
  await creedSetup(true)
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(agents)
  expect(await fs.readFile('ARCHITECTURE.md', 'utf8')).toBe(architecture)
  await expect(fs.access('AGENTS_temp.md')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('scaffolds all four full templates from main in order without prompting', async () => {
  const { templates, requests, prompts, exit } = await setupFixture()
  await creedSetup(true)
  expect(requests).toEqual(CREED_FILES.map(file => `${REMOTE_CREED_FILES_URL}${file}`))
  expect(prompts).toEqual([])
  expect(exit.mock.calls).toEqual([[0]])
  for (const file of CREED_FILES) {
    expect(await fs.readFile(file, 'utf8')).toBe(templates.get(`${REMOTE_CREED_FILES_URL}${file}`))
    await expect(fs.access(file.replace(/\.md$/, '_temp.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  }
})

test('downloads existing-file templates through COSCA and removes them after processing', async () => {
  const { templates } = await setupFixture()
  for (const file of CREED_FILES) {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, templates.get(`${REMOTE_CREED_FILES_URL}${file}`))
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
    expect(download.content).toBe(templates.get(`${REMOTE_CREED_FILES_URL}${CREED_FILES[index]}`))
    expect(writes.mock.calls.some(call => call[0] === path.resolve(download.file))).toBe(true)
    await expect(fs.access(download.file)).rejects.toMatchObject({ code: 'ENOENT' })
  }
})

test('replaces separate old blocks while retaining intervening user content and inline markers', async () => {
  await setupFixture()
  const inline = `Treat ${CREED_BLOCK_BEGIN} and ${CREED_BLOCK_END} as inert text.`
  await fs.writeFile('AGENTS.md', `# Custom\nBefore\n${CREED_BLOCK_BEGIN}\nOld one\n${CREED_BLOCK_END}\nBetween\n${CREED_BLOCK_BEGIN}\nOld two\n${CREED_BLOCK_END}\n${inline}`)
  await creedSetup(true)
  const expected = `# Custom\n\n${BLOCK}\n\nBefore\nBetween\n${inline}\n\n`
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(expected)
  await creedSetup(true)
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(expected)
})

test('extracts first through last template markers without duplicating that span on reruns', async () => {
  const { templates } = await setupFixture()
  const block = `${CREED_BLOCK_BEGIN}\nFirst section\n${CREED_BLOCK_END}\nTemplate middle\n${CREED_BLOCK_BEGIN}\nLast section\n${CREED_BLOCK_END}`
  templates.set(`${REMOTE_CREED_FILES_URL}AGENTS.md`, `# Template\nExcluded intro\n${block}\nExcluded outro`)
  await fs.writeFile('AGENTS.md', '# Custom\nUser body')
  await creedSetup(true)
  const expected = `# Custom\n\n${block}\n\nUser body\n\n`
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(expected)
  await creedSetup(true)
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(expected)
})

test('preserves custom skill metadata including comments, ordering and multiline values', async () => {
  await setupFixture()
  const metadata = '---\n# Custom comment\ndescription: |\n  ---\n  My own description\n  ...\nname: local-skill\ncustom: true\n---'
  await fs.mkdir(path.dirname(CREED_SKILL_FILE), { recursive: true })
  await fs.writeFile(CREED_SKILL_FILE, `${metadata}\nBefore\n${CREED_BLOCK_BEGIN}\nOld skill\n${CREED_BLOCK_END}\nAfter`)
  await creedSetup(true)
  const expected = `${metadata}\n\n${BLOCK}\n\nBefore\nAfter\n\n`
  expect(await fs.readFile(CREED_SKILL_FILE, 'utf8')).toBe(expected)
  await creedSetup(true)
  expect(await fs.readFile(CREED_SKILL_FILE, 'utf8')).toBe(expected)
})

test('adds template metadata to an existing skill without frontmatter', async () => {
  await setupFixture()
  await fs.mkdir(path.dirname(CREED_SKILL_FILE), { recursive: true })
  await fs.writeFile(CREED_SKILL_FILE, '# Local skill\n\nKeep this instruction.')
  await creedSetup(true)
  expect(await fs.readFile(CREED_SKILL_FILE, 'utf8')).toBe(`${METADATA}\n\n${BLOCK}\n\n# Local skill\n\nKeep this instruction.\n\n`)
})

test('handles empty files, literal first lines, CRLF, BOM and absent final newlines', async () => {
  const { templates } = await setupFixture()
  templates.set(`${REMOTE_CREED_FILES_URL}SECURITY.md`, templates.get(`${REMOTE_CREED_FILES_URL}SECURITY.md`).replaceAll('\n', '\r\n'))
  await fs.writeFile('AGENTS.md', '')
  await fs.writeFile('ARCHITECTURE.md', 'A literal first line')
  await fs.writeFile('SECURITY.md', '\uFEFF# Security\r\n\r\n  Keep spacing.  \r\n\r\nSecond line')
  await creedSetup(true)
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe(`# AGENTS.md\n\n${BLOCK}\n`)
  expect(await fs.readFile('ARCHITECTURE.md', 'utf8')).toBe(`A literal first line\n\n${BLOCK}\n`)
  const expected = `\uFEFF# Security\n\n${BLOCK}\n\n  Keep spacing.  \n\nSecond line\n\n`
  expect(await fs.readFile('SECURITY.md', 'utf8')).toBe(expected)
  await creedSetup(true)
  expect(await fs.readFile('SECURITY.md', 'utf8')).toBe(expected)
})

test('manual mode asks once per destination and leaves declined existing and missing files alone', async () => {
  const { requests, prompts } = await setupFixture(['n', 'n', 'y', 'n', 'y'])
  await fs.writeFile('AGENTS.md', '# Untouched\nMy instructions')
  await fs.writeFile('ARCHITECTURE.md', '# Custom architecture\nUser body')
  await creedSetup()
  expect(prompts.length).toBe(5)
  for (const [index, file] of CREED_FILES.entries()) expect(prompts[index + 1]).toContain(file)
  expect(requests).toEqual([`${REMOTE_CREED_FILES_URL}ARCHITECTURE.md`, `${REMOTE_CREED_FILES_URL}${CREED_SKILL_FILE}`])
  expect(await fs.readFile('AGENTS.md', 'utf8')).toBe('# Untouched\nMy instructions')
  expect(await fs.readFile('ARCHITECTURE.md', 'utf8')).toBe(`# Custom architecture\n\n${BLOCK}\n\nUser body\n\n`)
  await expect(fs.access('SECURITY.md')).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(fs.access('AGENTS_temp.md')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('choosing automatic setup at the initial prompt suppresses per-file prompts', async () => {
  const { prompts, requests } = await setupFixture(['yes'])
  await creedSetup()
  expect(prompts.length).toBe(1)
  expect(requests.length).toBe(4)
})

for (const [label, original, template, message] of [
  ['orphan opening', `# Custom\n${CREED_BLOCK_BEGIN}\nUser text`, null, /without a closing marker/],
  ['orphan closing', `# Custom\n${CREED_BLOCK_END}`, null, /without an opening marker/],
  ['reversed markers', `# Custom\n${CREED_BLOCK_END}\n${CREED_BLOCK_BEGIN}`, null, /without an opening marker/],
  ['nested markers', `# Custom\n${CREED_BLOCK_BEGIN}\n${CREED_BLOCK_BEGIN}\n${CREED_BLOCK_END}\n${CREED_BLOCK_END}`, null, /Nested/],
  ['marker as headline', `${CREED_BLOCK_BEGIN}\nUser text\n${CREED_BLOCK_END}`, null, /Expected a headline/],
  ['unmarked template', '# Custom\nUser text', '# Template\nNo markers', /missing Agent Creed markers/],
  ['unclosed template', '# Custom\nUser text', `# Template\n${CREED_BLOCK_BEGIN}\nNew text`, /without a closing marker/],
]) {
  test(`rejects ${label} without replacing the original`, async () => {
    const { templates, output, exit } = await setupFixture()
    if (template !== null) templates.set(`${REMOTE_CREED_FILES_URL}AGENTS.md`, template)
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
  await fs.mkdir(path.dirname(CREED_SKILL_FILE), { recursive: true })
  await fs.writeFile(CREED_SKILL_FILE, original)
  await expect(creedSetup(true)).rejects.toThrow(/Unterminated skill frontmatter/)
  expect(await fs.readFile(CREED_SKILL_FILE, 'utf8')).toBe(original)
  await expect(fs.access(CREED_SKILL_FILE.replace('.md', '_temp.md'))).rejects.toMatchObject({ code: 'ENOENT' })
})

for (const exists of [false, true]) {
  for (const failure of ['HTTP', 'network']) {
    test(`reports ${failure} failure for an ${exists ? 'existing' : 'absent'} file without fallback`, async () => {
      const { templates, requests, output } = await setupFixture()
      if (failure === 'HTTP') templates.delete(`${REMOTE_CREED_FILES_URL}AGENTS.md`)
      else templates.set(`${REMOTE_CREED_FILES_URL}AGENTS.md`, new Error('Network unavailable'))
      if (exists) await fs.writeFile('AGENTS.md', '# Original\nUntouched')
      await expect(creedSetup(true)).rejects.toThrow(/Could not set up 'AGENTS.md'.*(404|Network unavailable)/s)
      if (exists) expect(await fs.readFile('AGENTS.md', 'utf8')).toBe('# Original\nUntouched')
      else await expect(fs.access('AGENTS.md')).rejects.toMatchObject({ code: 'ENOENT' })
      expect(requests).toEqual([`${REMOTE_CREED_FILES_URL}AGENTS.md`])
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
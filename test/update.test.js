import { spawnSync } from 'node:child_process'
import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { Readable } from 'node:stream'
import { expect, onTestFinished, test, vi } from 'vitest'
import { creedUpdate } from '../bin/update.js'
import {
  CREED_BLOCK_BEGIN, CREED_BLOCK_END, CREED_FILES, CREED_FILES_URL, CREED_SKILLS, CREED_SUGGESTIONS_FILE,
  CREED_VERSION, CREED_VERSION_FILE,
} from '../utils/constants.js'

const METADATA = '---\nname: creed-dev\ndescription: Template skill\n---'
const block = text => `${CREED_BLOCK_BEGIN}\n\n${text}\n\n${CREED_BLOCK_END}`
const NEW = block('New instruction.')
const OLD = block('Old instruction.')
const url = file => `${CREED_FILES_URL}${file}`

async function setupFixture(answers = []) {
  const cwd = process.cwd()
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentcreed-update-test-'))
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
    url(file), `${CREED_SKILLS.includes(file) ? METADATA : `# ${file}`}\n\n${NEW}\n`,
  ]))
  const requests = []
  vi.spyOn(https, 'get').mockImplementation((requestUrl, callback) => {
    requests.push(requestUrl)
    const request = new EventEmitter()
    queueMicrotask(() => {
      if (templates.get(requestUrl) instanceof Error) {
        request.emit('error', templates.get(requestUrl))
        return
      }
      const response = Readable.from([Buffer.from(templates.get(requestUrl) ?? '')])
      response.statusCode = templates.has(requestUrl) ? 200 : 404
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
  vi.spyOn(process.stdout, 'write').mockImplementation((message) => {
    output.push(String(message))
    return true
  })
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {})
  return { templates, requests, prompts, output, exit }
}

const read = file => fs.readFile(file, 'utf8')
const missing = file => expect(fs.access(file)).rejects.toMatchObject({ code: 'ENOENT' })

async function writeFile(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content)
}

test('replaces the managed block in place and keeps surrounding user content', async () => {
  const { exit, output } = await setupFixture()
  await fs.writeFile('AGENTS.md', `# My project\n\nAbove\n\n${OLD}\n\nBelow\n`)
  await creedUpdate(true)
  const expected = `# My project\n\nAbove\n\n${NEW}\n\nBelow\n`
  expect(await read('AGENTS.md')).toBe(expected)
  expect(exit.mock.calls).toEqual([])
  expect(output.join('')).toContain('UPDATE COMPLETE')
  await creedUpdate(true)
  expect(await read('AGENTS.md')).toBe(expected)
})

test('does not rewrite files whose managed block is already current', async () => {
  await setupFixture()
  const current = `# My project\n\n${NEW}\n\nBelow\n`
  await fs.writeFile('AGENTS.md', current)
  const write = vi.spyOn(fs, 'writeFile')
  await creedUpdate(true)
  expect(write.mock.calls.filter(call => call[0] === 'AGENTS.md')).toEqual([])
  expect(await read('AGENTS.md')).toBe(current)
})

test('replaces the span from the first to the last local marker with the template span', async () => {
  const { templates } = await setupFixture()
  const span = `${CREED_BLOCK_BEGIN}\nFirst\n${CREED_BLOCK_END}\nTemplate middle\n${CREED_BLOCK_BEGIN}\nLast\n${CREED_BLOCK_END}`
  templates.set(url('AGENTS.md'), `# Template\nExcluded intro\n${span}\nExcluded outro`)
  await fs.writeFile('AGENTS.md', `# Custom\nBefore\n${OLD}\nDropped\n${OLD}\nAfter`)
  await creedUpdate(true)
  const expected = `# Custom\nBefore\n${span}\nAfter`
  expect(await read('AGENTS.md')).toBe(expected)
  await creedUpdate(true)
  expect(await read('AGENTS.md')).toBe(expected)
})

test('keeps inline marker mentions outside of blocks untouched', async () => {
  await setupFixture()
  const inline = `Treat ${CREED_BLOCK_BEGIN} and ${CREED_BLOCK_END} as inert text.`
  await fs.writeFile('AGENTS.md', `# Custom\n${OLD}\n${inline}`)
  await creedUpdate(true)
  expect(await read('AGENTS.md')).toBe(`# Custom\n${NEW}\n${inline}`)
})

test('replaces blocks in skill files without touching their metadata', async () => {
  await setupFixture()
  const metadata = '---\n# Custom comment\nname: local-skill\ncustom: true\n---'
  await writeFile(CREED_SKILLS[0], `${metadata}\n\n# Mine\n\n${OLD}\n\nAfter`)
  await creedUpdate(true)
  expect(await read(CREED_SKILLS[0])).toBe(`${metadata}\n\n# Mine\n\n${NEW}\n\nAfter`)
})

test('scaffolds every missing file from its template in order', async () => {
  const { templates, requests, prompts, exit } = await setupFixture()
  await creedUpdate(true)
  expect(requests).toEqual(CREED_FILES.map(url))
  expect(prompts).toEqual([])
  expect(exit.mock.calls).toEqual([])
  for (const file of CREED_FILES) expect(await read(file)).toBe(templates.get(url(file)))
})

test('scaffolds only the missing files and updates the existing ones', async () => {
  const { templates } = await setupFixture()
  await fs.writeFile('AGENTS.md', `# Mine\n\n${OLD}\n`)
  await creedUpdate(true)
  expect(await read('AGENTS.md')).toBe(`# Mine\n\n${NEW}\n`)
  for (const file of CREED_FILES.slice(1)) expect(await read(file)).toBe(templates.get(url(file)))
})

test('updates the managed block of an existing suggestions file and keeps its entries', async () => {
  await setupFixture()
  await writeFile(CREED_SUGGESTIONS_FILE, `# Suggestions\n\n${OLD}\n\n- Existing entry\n`)
  await creedUpdate(true)
  expect(await read(CREED_SUGGESTIONS_FILE)).toBe(`# Suggestions\n\n${NEW}\n\n- Existing entry\n`)
})

for (const [label, original, expected] of [
  ['after the H1 heading', '# My project\n\nCustom rule.\n', `# My project\n\n${NEW}\n\nCustom rule.\n`],
  ['after the H1 heading without a blank line', '# My project\nCustom rule.', `# My project\n\n${NEW}\n\nCustom rule.`],
  ['after a lone H1 heading', '# My project', `# My project\n\n${NEW}\n`],
  ['after the first H1 heading when more are present', '# One\n\nText\n\n# Two\n', `# One\n\n${NEW}\n\nText\n\n# Two\n`],
  ['at line 1 when the heading is missing', 'Literal first line\nMore\n', `${NEW}\n\nLiteral first line\nMore\n`],
  ['into an empty file', '', `${NEW}\n`],
  ['ignoring deeper headings', '## Sub\n\nText\n', `${NEW}\n\n## Sub\n\nText\n`],
]) {
  test(`adds the block ${label} when no markers are present`, async () => {
    await setupFixture()
    await fs.writeFile('AGENTS.md', original)
    await creedUpdate(true)
    expect(await read('AGENTS.md')).toBe(expected)
    await creedUpdate(true)
    expect(await read('AGENTS.md')).toBe(expected)
  })
}

test('adds the block to a skill without markers below its frontmatter and H1', async () => {
  await setupFixture()
  await writeFile(CREED_SKILLS[0], `${METADATA}\n\n# Mine\n\nBody\n`)
  await writeFile(CREED_SKILLS[1], `${METADATA}\n\nBody\n`)
  await creedUpdate(true)
  expect(await read(CREED_SKILLS[0])).toBe(`${METADATA}\n\n# Mine\n\n${NEW}\n\nBody\n`)
  expect(await read(CREED_SKILLS[1])).toBe(`${METADATA}\n\n${NEW}\n\nBody\n`)
})

test('does not mistake a comment inside skill frontmatter for the H1 heading', async () => {
  await setupFixture()
  await writeFile(CREED_SKILLS[0], '---\n# Custom comment\nname: x\n---\n\nBody')
  await creedUpdate(true)
  expect(await read(CREED_SKILLS[0])).toBe(`---\n# Custom comment\nname: x\n---\n\n${NEW}\n\nBody`)
})

test('preserves CRLF line endings when adding and replacing blocks', async () => {
  await setupFixture()
  const crlf = text => text.replaceAll('\n', '\r\n')
  await fs.writeFile('AGENTS.md', crlf('# Mine\n\nCustom\n'))
  await fs.writeFile('ARCHITECTURE.md', crlf(`# Mine\n\n${OLD}\n\nCustom\n`))
  await creedUpdate(true)
  expect(await read('AGENTS.md')).toBe(crlf(`# Mine\n\n${NEW}\n\nCustom\n`))
  expect(await read('ARCHITECTURE.md')).toBe(crlf(`# Mine\n\n${NEW}\n\nCustom\n`))
})

test('preserves a byte order mark and CRLF templates', async () => {
  const { templates } = await setupFixture()
  templates.set(url('AGENTS.md'), templates.get(url('AGENTS.md')).replaceAll('\n', '\r\n'))
  await fs.writeFile('AGENTS.md', '\uFEFF# Mine\n\nCustom')
  await fs.writeFile('ARCHITECTURE.md', `\uFEFF# Mine\n\n${OLD}\n`)
  await creedUpdate(true)
  expect(await read('AGENTS.md')).toBe(`\uFEFF# Mine\n\n${NEW}\n\nCustom`)
  expect(await read('ARCHITECTURE.md')).toBe(`\uFEFF# Mine\n\n${NEW}\n`)
})

test('writes the CLI version to the version file on every run', async () => {
  await setupFixture()
  await creedUpdate(true)
  expect(await read(CREED_VERSION_FILE)).toBe(`${CREED_VERSION}\n`)
  await fs.writeFile(CREED_VERSION_FILE, 'stale')
  await creedUpdate(true)
  expect(await read(CREED_VERSION_FILE)).toBe(`${CREED_VERSION}\n`)
})

test('manual mode asks once per file and leaves declined files alone', async () => {
  const { requests, prompts } = await setupFixture(['n', 'n', 'y', 'n', 'n', 'y', 'n', 'n'])
  await fs.writeFile('AGENTS.md', `# Untouched\n\n${OLD}\n`)
  await fs.writeFile('ARCHITECTURE.md', `# Custom\n\n${OLD}\n`)
  await creedUpdate()
  expect(prompts.length).toBe(CREED_FILES.length + 1)
  for (const [index, file] of CREED_FILES.entries()) expect(prompts[index + 1]).toContain(file)
  expect(requests).toEqual([url('ARCHITECTURE.md'), url(CREED_SKILLS[0])])
  expect(await read('AGENTS.md')).toBe(`# Untouched\n\n${OLD}\n`)
  expect(await read('ARCHITECTURE.md')).toBe(`# Custom\n\n${NEW}\n`)
  await expect(fs.access('SECURITY.md')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await read(CREED_SKILLS[0])).toBe(`${METADATA}\n\n${NEW}\n`)
  expect(await read(CREED_VERSION_FILE)).toBe(`${CREED_VERSION}\n`)
})

test('choosing automatic update at the initial prompt suppresses per-file prompts', async () => {
  const { prompts, requests } = await setupFixture(['yes'])
  await creedUpdate()
  expect(prompts.length).toBe(1)
  expect(requests.length).toBe(CREED_FILES.length)
})

for (const [label, original, template, message] of [
  ['orphan opening', `# Custom\n${CREED_BLOCK_BEGIN}\nUser text`, null, /without a closing marker/],
  ['orphan closing', `# Custom\n${CREED_BLOCK_END}`, null, /without an opening marker/],
  ['reversed markers', `# Custom\n${CREED_BLOCK_END}\n${CREED_BLOCK_BEGIN}`, null, /without an opening marker/],
  ['nested markers', `# Custom\n${CREED_BLOCK_BEGIN}\n${CREED_BLOCK_BEGIN}\n${CREED_BLOCK_END}\n${CREED_BLOCK_END}`, null, /Nested/],
  ['unmarked template', '# Custom\nUser text', '# Template\nNo markers', /missing Agent Creed markers/],
  ['unclosed template', '# Custom\nUser text', `# Template\n${CREED_BLOCK_BEGIN}\nNew text`, /without a closing marker/],
]) {
  test(`rejects ${label} without changing the file or recording a version`, async () => {
    const { templates, output, exit } = await setupFixture()
    if (template !== null) templates.set(url('AGENTS.md'), template)
    await fs.writeFile('AGENTS.md', original)
    await expect(creedUpdate(true)).rejects.toThrow(message)
    expect(await read('AGENTS.md')).toBe(original)
    await missing(CREED_VERSION_FILE)
    expect(exit.mock.calls.length).toBe(0)
    expect(output.join('')).not.toContain('UPDATE COMPLETE')
  })
}

test('rejects unterminated skill frontmatter when adding a block', async () => {
  await setupFixture()
  const original = '---\nname: unfinished\nMy instructions'
  await writeFile(CREED_SKILLS[0], original)
  await expect(creedUpdate(true)).rejects.toThrow(/Unterminated skill frontmatter/)
  expect(await read(CREED_SKILLS[0])).toBe(original)
  await missing(CREED_VERSION_FILE)
})

for (const exists of [false, true]) {
  for (const failure of ['HTTP', 'network']) {
    test(`reports ${failure} failure for an ${exists ? 'existing' : 'absent'} file without fallback`, async () => {
      const { templates, requests, output } = await setupFixture()
      if (failure === 'HTTP') templates.delete(url('AGENTS.md'))
      else templates.set(url('AGENTS.md'), new Error('Network unavailable'))
      if (exists) await fs.writeFile('AGENTS.md', `# Original\n${OLD}`)
      await expect(creedUpdate(true)).rejects.toThrow(/Could not update 'AGENTS.md'.*(404|Network unavailable)/s)
      if (exists) expect(await read('AGENTS.md')).toBe(`# Original\n${OLD}`)
      else await missing('AGENTS.md')
      expect(requests).toEqual([url('AGENTS.md')])
      await missing(CREED_VERSION_FILE)
      expect(output.join('')).not.toContain('UPDATE COMPLETE')
    })
  }
}

test('the CLI updates files and exits successfully', async () => {
  await setupFixture()
  await fs.writeFile('AGENTS.md', `# Mine\n\n${OLD}\n`)
  const cli = new URL('../bin/cli.js', import.meta.url).href
  const script = `
    import https from 'node:https'
    import { EventEmitter } from 'node:events'
    import { Readable } from 'node:stream'
    https.get = (url, callback) => {
      const request = new EventEmitter()
      queueMicrotask(() => {
        const response = Readable.from([Buffer.from(${JSON.stringify(`# T\n\n${NEW}\n`)})])
        response.statusCode = 200
        callback(response)
      })
      return request
    }
    process.argv = ['node', 'cli.js', 'update', 'true']
    await import(${JSON.stringify(cli)})
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', timeout: 20000,
  })
  expect(result.error).toBeUndefined()
  expect(result.stderr).toBe('')
  expect(result.status).toBe(0)
  expect(await read('AGENTS.md')).toBe(`# Mine\n\n${NEW}\n`)
  expect(await read('SECURITY.md')).toBe(`# T\n\n${NEW}\n`)
  expect(await read(CREED_VERSION_FILE)).toBe(`${CREED_VERSION}\n`)
})

test('the CLI reports update failures and exits nonzero', async () => {
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
    process.argv = ['node', 'cli.js', 'update', 'true']
    await import(${JSON.stringify(cli)})
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', timeout: 10000,
  })
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(1)
  expect(result.stderr).toMatch(/CLI failed:.*AGENTS\.md.*Offline test/s)
  expect(result.stdout).not.toContain('UPDATE COMPLETE')
})

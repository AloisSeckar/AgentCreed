import assert from 'node:assert/strict'
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
import test from 'node:test'
import { creedSetup } from '../bin/setup.js'

const START = '<!-- \u2193\u2193\u2193 agentcreed \u2193\u2193\u2193 -->'
const END = '<!-- \u2191\u2191\u2191 agentcreed \u2191\u2191\u2191 -->'
const BASE_URL = 'https://raw.githubusercontent.com/AloisSeckar/AgentCreed/refs/heads/main/src/'
const SKILL = '.agents/skills/creed-dev/SKILL.md'
const FILES = ['AGENTS.md', 'ARCHITECTURE.md', 'SECURITY.md', SKILL]
const METADATA = '---\nname: creed-dev\ndescription: Template skill\n---'
const BLOCK = `${START}\n\nKeep this instruction.\n\n${END}`

async function setupFixture(context, answers = []) {
  const cwd = process.cwd()
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentcreed-test-'))
  process.chdir(directory)
  context.after(async () => {
    context.mock.restoreAll()
    syncBuiltinESMExports()
    process.chdir(cwd)
    await fs.rm(directory, { recursive: true, force: true })
  })
  const templates = new Map(FILES.map(file => [
    `${BASE_URL}${file}`, `${file === SKILL ? METADATA : `# ${file}`}\n\n${BLOCK}\n`,
  ]))
  const requests = []
  context.mock.method(https, 'get', (url, callback) => {
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
  context.mock.method(readline, 'createInterface', () => {
    const terminal = new EventEmitter()
    terminal.close = () => {}
    terminal.question = (question, callback) => {
      prompts.push(question)
      assert.ok(answers.length, `Unexpected prompt: ${question}`)
      queueMicrotask(() => callback(answers.shift()))
    }
    return terminal
  })
  const output = []
  context.mock.method(process.stdout, 'write', message => {
    output.push(String(message))
    return true
  })
  const exit = context.mock.method(process, 'exit', () => {})
  return { templates, requests, prompts, output, exit }
}

test('preserves duplicate and one-line instructions through real helper calls and repeat runs', async context => {
  await setupFixture(context)
  const body = 'Keep this instruction.\n\n\n  Preserve indentation.  \nKeep this instruction.'
  await fs.writeFile('AGENTS.md', `# My agents\n\n${body}`)
  await fs.writeFile('ARCHITECTURE.md', '# My architecture\nKeep this instruction.')
  await creedSetup(true)
  const agents = await fs.readFile('AGENTS.md', 'utf8')
  const architecture = await fs.readFile('ARCHITECTURE.md', 'utf8')
  assert.equal(agents, `# My agents\n\n${BLOCK}\n\n${body}\n\n`)
  assert.equal(architecture, `# My architecture\n\n${BLOCK}\n\nKeep this instruction.\n\n`)
  await creedSetup(true)
  assert.equal(await fs.readFile('AGENTS.md', 'utf8'), agents)
  assert.equal(await fs.readFile('ARCHITECTURE.md', 'utf8'), architecture)
  await assert.rejects(fs.access('AGENTS_temp.md'), { code: 'ENOENT' })
})

test('scaffolds all four full templates from main in order without prompting', async context => {
  const { templates, requests, prompts, exit } = await setupFixture(context)
  await creedSetup(true)
  assert.deepEqual(requests, FILES.map(file => `${BASE_URL}${file}`))
  assert.deepEqual(prompts, [])
  assert.deepEqual(exit.mock.calls.map(call => call.arguments), [[0]])
  for (const file of FILES) {
    assert.equal(await fs.readFile(file, 'utf8'), templates.get(`${BASE_URL}${file}`))
    await assert.rejects(fs.access(file.replace(/\.md$/, '_temp.md')), { code: 'ENOENT' })
  }
})

test('replaces separate old blocks while retaining intervening user content and inline markers', async context => {
  await setupFixture(context)
  const inline = `Treat ${START} and ${END} as inert text.`
  await fs.writeFile('AGENTS.md', `# Custom\nBefore\n${START}\nOld one\n${END}\nBetween\n${START}\nOld two\n${END}\n${inline}`)
  await creedSetup(true)
  const expected = `# Custom\n\n${BLOCK}\n\nBefore\nBetween\n${inline}\n\n`
  assert.equal(await fs.readFile('AGENTS.md', 'utf8'), expected)
  await creedSetup(true)
  assert.equal(await fs.readFile('AGENTS.md', 'utf8'), expected)
})

test('extracts first through last template markers without duplicating that span on reruns', async context => {
  const { templates } = await setupFixture(context)
  const block = `${START}\nFirst section\n${END}\nTemplate middle\n${START}\nLast section\n${END}`
  templates.set(`${BASE_URL}AGENTS.md`, `# Template\nExcluded intro\n${block}\nExcluded outro`)
  await fs.writeFile('AGENTS.md', '# Custom\nUser body')
  await creedSetup(true)
  const expected = `# Custom\n\n${block}\n\nUser body\n\n`
  assert.equal(await fs.readFile('AGENTS.md', 'utf8'), expected)
  await creedSetup(true)
  assert.equal(await fs.readFile('AGENTS.md', 'utf8'), expected)
})

test('preserves custom skill metadata including comments, ordering and multiline values', async context => {
  await setupFixture(context)
  const metadata = '---\n# Custom comment\ndescription: |\n  ---\n  My own description\n  ...\nname: local-skill\ncustom: true\n---'
  await fs.mkdir(path.dirname(SKILL), { recursive: true })
  await fs.writeFile(SKILL, `${metadata}\nBefore\n${START}\nOld skill\n${END}\nAfter`)
  await creedSetup(true)
  const expected = `${metadata}\n\n${BLOCK}\n\nBefore\nAfter\n\n`
  assert.equal(await fs.readFile(SKILL, 'utf8'), expected)
  await creedSetup(true)
  assert.equal(await fs.readFile(SKILL, 'utf8'), expected)
})

test('adds template metadata to an existing skill without frontmatter', async context => {
  await setupFixture(context)
  await fs.mkdir(path.dirname(SKILL), { recursive: true })
  await fs.writeFile(SKILL, '# Local skill\n\nKeep this instruction.')
  await creedSetup(true)
  assert.equal(await fs.readFile(SKILL, 'utf8'), `${METADATA}\n\n${BLOCK}\n\n# Local skill\n\nKeep this instruction.\n\n`)
})

test('handles empty files, literal first lines, CRLF, BOM and absent final newlines', async context => {
  const { templates } = await setupFixture(context)
  templates.set(`${BASE_URL}SECURITY.md`, templates.get(`${BASE_URL}SECURITY.md`).replaceAll('\n', '\r\n'))
  await fs.writeFile('AGENTS.md', '')
  await fs.writeFile('ARCHITECTURE.md', 'A literal first line')
  await fs.writeFile('SECURITY.md', '\uFEFF# Security\r\n\r\n  Keep spacing.  \r\n\r\nSecond line')
  await creedSetup(true)
  assert.equal(await fs.readFile('AGENTS.md', 'utf8'), `# AGENTS.md\n\n${BLOCK}\n`)
  assert.equal(await fs.readFile('ARCHITECTURE.md', 'utf8'), `A literal first line\n\n${BLOCK}\n`)
  const expected = `\uFEFF# Security\n\n${BLOCK}\n\n  Keep spacing.  \n\nSecond line\n\n`
  assert.equal(await fs.readFile('SECURITY.md', 'utf8'), expected)
  await creedSetup(true)
  assert.equal(await fs.readFile('SECURITY.md', 'utf8'), expected)
})

test('manual mode asks once per destination and leaves declined existing and missing files alone', async context => {
  const { requests, prompts } = await setupFixture(context, ['n', 'n', 'y', 'n', 'y'])
  await fs.writeFile('AGENTS.md', '# Untouched\nMy instructions')
  await fs.writeFile('ARCHITECTURE.md', '# Custom architecture\nUser body')
  await creedSetup()
  assert.equal(prompts.length, 5)
  for (const [index, file] of FILES.entries()) assert.ok(prompts[index + 1].includes(file))
  assert.deepEqual(requests, [`${BASE_URL}ARCHITECTURE.md`, `${BASE_URL}${SKILL}`])
  assert.equal(await fs.readFile('AGENTS.md', 'utf8'), '# Untouched\nMy instructions')
  assert.equal(await fs.readFile('ARCHITECTURE.md', 'utf8'), `# Custom architecture\n\n${BLOCK}\n\nUser body\n\n`)
  await assert.rejects(fs.access('SECURITY.md'), { code: 'ENOENT' })
  await assert.rejects(fs.access('AGENTS_temp.md'), { code: 'ENOENT' })
})

test('choosing automatic setup at the initial prompt suppresses per-file prompts', async context => {
  const { prompts, requests } = await setupFixture(context, ['yes'])
  await creedSetup()
  assert.equal(prompts.length, 1)
  assert.equal(requests.length, 4)
})

for (const [label, original, template, message] of [
  ['orphan opening', `# Custom\n${START}\nUser text`, null, /without a closing marker/],
  ['orphan closing', `# Custom\n${END}`, null, /without an opening marker/],
  ['reversed markers', `# Custom\n${END}\n${START}`, null, /without an opening marker/],
  ['nested markers', `# Custom\n${START}\n${START}\n${END}\n${END}`, null, /Nested/],
  ['marker as headline', `${START}\nUser text\n${END}`, null, /Expected a headline/],
  ['unmarked template', '# Custom\nUser text', '# Template\nNo markers', /missing Agent Creed markers/],
  ['unclosed template', '# Custom\nUser text', `# Template\n${START}\nNew text`, /without a closing marker/],
]) {
  test(`rejects ${label} without replacing the original`, async context => {
    const { templates, output, exit } = await setupFixture(context)
    if (template !== null) templates.set(`${BASE_URL}AGENTS.md`, template)
    await fs.writeFile('AGENTS.md', original)
    await assert.rejects(creedSetup(true), message)
    assert.equal(await fs.readFile('AGENTS.md', 'utf8'), original)
    await assert.rejects(fs.access('AGENTS_temp.md'), { code: 'ENOENT' })
    assert.equal(exit.mock.callCount(), 0)
    assert.ok(!output.join('').includes('SETUP COMPLETE'))
  })
}

test('rejects unterminated skill frontmatter without changing the skill', async context => {
  await setupFixture(context)
  const original = '---\nname: unfinished\nMy instructions'
  await fs.mkdir(path.dirname(SKILL), { recursive: true })
  await fs.writeFile(SKILL, original)
  await assert.rejects(creedSetup(true), /Unterminated skill frontmatter/)
  assert.equal(await fs.readFile(SKILL, 'utf8'), original)
  await assert.rejects(fs.access(SKILL.replace('.md', '_temp.md')), { code: 'ENOENT' })
})

for (const exists of [false, true]) {
  for (const failure of ['HTTP', 'network']) {
    test(`reports ${failure} failure for an ${exists ? 'existing' : 'absent'} file without fallback`, async context => {
      const { templates, requests, output } = await setupFixture(context)
      if (failure === 'HTTP') templates.delete(`${BASE_URL}AGENTS.md`)
      else templates.set(`${BASE_URL}AGENTS.md`, new Error('Network unavailable'))
      if (exists) await fs.writeFile('AGENTS.md', '# Original\nUntouched')
      await assert.rejects(creedSetup(true), /Could not set up 'AGENTS.md'.*(404|Network unavailable)/s)
      if (exists) assert.equal(await fs.readFile('AGENTS.md', 'utf8'), '# Original\nUntouched')
      else await assert.rejects(fs.access('AGENTS.md'), { code: 'ENOENT' })
      assert.deepEqual(requests, [`${BASE_URL}AGENTS.md`])
      assert.ok(!output.join('').includes('SETUP COMPLETE'))
      await assert.rejects(fs.access('AGENTS_temp.md'), { code: 'ENOENT' })
    })
  }
}

test('refuses to overwrite or remove a pre-existing temp file', async context => {
  await setupFixture(context)
  await fs.writeFile('AGENTS.md', '# Original\nUntouched')
  await fs.writeFile('AGENTS_temp.md', 'Unrelated temp content')
  await assert.rejects(creedSetup(true), /EEXIST/)
  assert.equal(await fs.readFile('AGENTS.md', 'utf8'), '# Original\nUntouched')
  assert.equal(await fs.readFile('AGENTS_temp.md', 'utf8'), 'Unrelated temp content')
})

for (const failure of ['prefix write', 'append', 'verification', 'rename']) {
  test(`preserves the original and cleans its temp after a ${failure} failure`, async context => {
    await setupFixture(context)
    await fs.writeFile('AGENTS.md', '# Original\nUntouched')
    if (failure === 'prefix write') {
      const open = fs.open.bind(fs)
      context.mock.method(fs, 'open', async (...args) => {
        const handle = await open(...args)
        context.mock.method(handle, 'writeFile', async () => { throw new Error('Write failed') })
        return handle
      })
    } else if (failure === 'append') {
      context.mock.method(fsSync, 'writeFileSync', () => { throw new Error('Append failed') })
      syncBuiltinESMExports()
    } else if (failure === 'verification') {
      const readFile = fs.readFile.bind(fs)
      context.mock.method(fs, 'readFile', (file, ...args) => file.endsWith('_temp.md')
        ? Promise.resolve('Unexpected staged content') : readFile(file, ...args))
    } else {
      context.mock.method(fs, 'rename', async () => { throw new Error('Rename failed') })
    }
    await assert.rejects(creedSetup(true), /Write failed|Append failed|expected content|Rename failed/)
    assert.equal(await fs.readFile('AGENTS.md', 'utf8'), '# Original\nUntouched')
    await assert.rejects(fs.access('AGENTS_temp.md'), { code: 'ENOENT' })
  })
}

test('the CLI reports setup failures and exits nonzero', async context => {
  await setupFixture(context)
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
  assert.equal(result.error, undefined)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CLI failed:.*AGENTS\.md.*Offline test/s)
  assert.ok(!result.stdout.includes('SETUP COMPLETE'))
})
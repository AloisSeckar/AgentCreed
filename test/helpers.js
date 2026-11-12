import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { Readable } from 'node:stream'
import { expect, onTestFinished, vi } from 'vitest'
import { CREED_BLOCK_BEGIN, CREED_BLOCK_END, CREED_FILES, CREED_FILES_URL, CREED_SKILLS } from '../utils/constants.js'

/** Skill frontmatter used by mocked templates */
export const METADATA = '---\nname: creed-dev\ndescription: Template skill\n---'

/**
 * Wrap text into the AgentCreed managed block markers.
 *
 * @param {string} text - Content of the block.
 * @returns {string} Text surrounded by the begin and end markers.
 */
export const block = text => `${CREED_BLOCK_BEGIN}\n\n${text}\n\n${CREED_BLOCK_END}`

/**
 * Build the template URL of an AgentCreed file.
 *
 * @param {string} file - Path of the file relative to the templates root.
 * @returns {string} Full URL of the template.
 */
export const templateUrl = file => `${CREED_FILES_URL}${file}`

/**
 * Prepare an isolated test environment in a temp directory with mocked network, prompts, stdout and exit.
 *
 * @param {string[]} answers - Queued answers to prompts; an unexpected prompt fails the test.
 * @param {string} templateBlock - Managed block put into every mocked template.
 * @returns {Promise<{templates: Map<string, string|Error>, requests: string[], prompts: string[], output: string[], exit: object}>} Mutable templates by URL and the recorded requests, prompts, stdout output and the `process.exit` spy.
 */
export async function setupFixture(answers = [], templateBlock = block('Keep this instruction.')) {
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
    templateUrl(file), `${CREED_SKILLS.includes(file) ? METADATA : `# ${file}`}\n\n${templateBlock}\n`,
  ]))
  const requests = []
  vi.spyOn(https, 'get').mockImplementation((url, callback) => {
    requests.push(url)
    const request = new EventEmitter()
    request.destroy = error => queueMicrotask(() => request.emit('error', error))
    queueMicrotask(() => {
      if (templates.get(url) instanceof Error) {
        request.emit('error', templates.get(url))
        return
      }
      const response = Readable.from([Buffer.from(templates.get(url) ?? '')])
      response.statusCode = templates.has(url) ? 200 : 404
      response.headers = {}
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

/**
 * Create a directory outside of the test working directory and link `link` to it with a junction (symlink on POSIX).
 *
 * @param {string} link - Path of the link relative to the working directory.
 * @returns {Promise<{outside: string}|null>} The outside directory, or null when the platform refuses to create the link.
 */
export async function linkOutside(link) {
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'agentcreed-outside-'))
  onTestFinished(() => fs.rm(outside, { recursive: true, force: true }))
  try {
    await fs.symlink(outside, link, 'junction')
  } catch (error) {
    if (error.code === 'EPERM') return null
    throw error
  }
  return { outside }
}
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const directory = '.e2e'
const state = `${directory}/state`
mkdirSync(directory, { recursive: true })
const password = randomBytes(18).toString('base64url')
async function hashPassword(value: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256)
  const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `pbkdf2-sha256$100000$${hex(salt)}$${hex(new Uint8Array(bits))}`
}
const [studentHash, parentHash] = await Promise.all([hashPassword(password), hashPassword(`${password}-parent`)])
const escapedStudentHash = studentHash.replaceAll('$', '\\$')
const escapedParentHash = parentHash.replaceAll('$', '\\$')
writeFileSync(`${directory}/.dev.vars`, `ENVIRONMENT="test"\nSTUDENT_PASSWORD_HASH="${escapedStudentHash}"\nPARENT_PASSWORD_HASH="${escapedParentHash}"\nSESSION_SECRET="${randomBytes(40).toString('hex')}"\n`)
writeFileSync(`${directory}/auth.json`, JSON.stringify({ studentPassword: password }))

const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx'
function wrangler(args: string[]) {
  const result = spawnSync(runner, ['wrangler', ...args, '--local', '--persist-to', state], { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
wrangler(['d1', 'migrations', 'apply', 'gcse-revision-db'])
for (const file of ['development.sql', 'phase4_planner.sql']) {
  wrangler(['d1', 'execute', 'gcse-revision-db', '--file', `database/seed/${file}`])
}

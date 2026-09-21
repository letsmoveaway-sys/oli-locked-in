import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { pbkdf2Sync, randomBytes } from 'node:crypto'

const directory = '.e2e'
const state = `${directory}/state`
mkdirSync(directory, { recursive: true })
const password = randomBytes(18).toString('base64url')
function hashPassword(value: string): string {
  const salt = randomBytes(16)
  return `pbkdf2-sha256$210000$${salt.toString('hex')}$${pbkdf2Sync(value, salt, 210_000, 32, 'sha256').toString('hex')}`
}
const [studentHash, parentHash] = await Promise.all([hashPassword(password), hashPassword(`${password}-parent`)])
const escapedStudentHash = studentHash.replaceAll('$', '\\$')
const escapedParentHash = parentHash.replaceAll('$', '\\$')
writeFileSync(`${directory}/.dev.vars`, `STUDENT_PASSWORD_HASH="${escapedStudentHash}"\nPARENT_PASSWORD_HASH="${escapedParentHash}"\nSESSION_SECRET="${randomBytes(40).toString('hex')}"\n`)
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

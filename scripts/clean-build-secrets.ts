import { existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'

const generatedSecrets = resolve('dist', 'gcse_revision', '.dev.vars')
if (existsSync(generatedSecrets)) unlinkSync(generatedSecrets)

import type { D1Database } from '@cloudflare/workers-types'

export type UserRole = 'student' | 'parent'

export interface Env {
  DB: D1Database
  ENVIRONMENT: string
  STUDENT_PASSWORD_HASH: string
  PARENT_PASSWORD_HASH: string
  SESSION_SECRET: string
}

export interface UserRecord {
  id: string
  email_or_username: string
  display_name: string
  role: UserRole
  active: number
}

export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: UserRole
}

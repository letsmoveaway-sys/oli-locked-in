import type { D1Database, RateLimit } from '@cloudflare/workers-types'

export type UserRole = 'student' | 'parent'

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  DB: D1Database
  LOGIN_RATE_LIMITER?: RateLimit
  ENVIRONMENT: string
  STUDENT_PASSWORD_HASH: string
  PARENT_PASSWORD_HASH: string
  SESSION_SECRET: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
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

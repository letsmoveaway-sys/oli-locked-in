import type { SessionUser, UserRole } from '../types'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const COOKIE_NAME = 'gcse_session'
const SESSION_SECONDS = 60 * 60 * 12

interface SessionPayload extends SessionUser {
  expiresAt: number
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

async function signature(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

export async function createSessionToken(user: SessionUser, secret: string): Promise<string> {
  const payload: SessionPayload = { ...user, expiresAt: Date.now() + SESSION_SECONDS * 1000 }
  const encoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  return `${encoded}.${base64UrlEncode(await signature(encoded, secret))}`
}

export async function readSessionToken(token: string, secret: string): Promise<SessionUser | null> {
  const [encoded, suppliedSignature] = token.split('.')
  if (!encoded || !suppliedSignature) return null
  const suppliedBytes = base64UrlDecode(suppliedSignature)
  if (!suppliedBytes) return null

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify('HMAC', key, suppliedBytes as BufferSource, encoder.encode(encoded))
  if (!valid) return null

  try {
    const bytes = base64UrlDecode(encoded)
    if (!bytes) return null
    const payload = JSON.parse(decoder.decode(bytes)) as Partial<SessionPayload>
    if (
      typeof payload.id !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.displayName !== 'string' ||
      (payload.role !== 'student' && payload.role !== 'parent') ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= Date.now()
    ) return null
    return {
      id: payload.id,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role,
    }
  } catch {
    return null
  }
}

export function sessionCookie(token: string, production: boolean): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${production ? '; Secure' : ''}`
}

export function expiredSessionCookie(production: boolean): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${production ? '; Secure' : ''}`
}

export function sessionTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get('Cookie')
  if (!cookie) return null
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === COOKIE_NAME) return rest.join('=') || null
  }
  return null
}

export async function requireSession(
  request: Request,
  secret: string,
  role?: UserRole,
): Promise<SessionUser | null> {
  const token = sessionTokenFromRequest(request)
  if (!token) return null
  const user = await readSessionToken(token, secret)
  return user && (!role || user.role === role) ? user : null
}

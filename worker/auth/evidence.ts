const encoder = new TextEncoder()
const decoder = new TextDecoder()

export interface EvidenceTokenPayload {
  studentId: string
  topicId: string
  questionId: string
  score: number
  maximumScore: number
  confidence: 'medium' | 'high'
  summary: string
  nextStep: string
  modelVersion: string
  rubricVersion: string
  expiresAt: number
}

function encode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function decode(value: string): Uint8Array | null {
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  } catch { return null }
}

async function keyFor(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usage)
}

export async function createEvidenceToken(payload: Omit<EvidenceTokenPayload, 'expiresAt'>, secret: string): Promise<string> {
  const encoded = encode(encoder.encode(JSON.stringify({ ...payload, expiresAt: Date.now() + 10 * 60 * 1000 })))
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await keyFor(secret, ['sign']), encoder.encode(encoded)))
  return `${encoded}.${encode(signature)}`
}

export async function readEvidenceToken(token: string, secret: string): Promise<EvidenceTokenPayload | null> {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null
  const signatureBytes = decode(signature)
  if (!signatureBytes || !(await crypto.subtle.verify('HMAC', await keyFor(secret, ['verify']), signatureBytes as BufferSource, encoder.encode(encoded)))) return null
  try {
    const bytes = decode(encoded)
    if (!bytes) return null
    const value = JSON.parse(decoder.decode(bytes)) as EvidenceTokenPayload
    if (!value.studentId || !value.topicId || !value.questionId || !Number.isFinite(value.score) || !Number.isFinite(value.maximumScore) || value.expiresAt <= Date.now() || !['medium', 'high'].includes(value.confidence) || !value.modelVersion || !value.rubricVersion) return null
    return value
  } catch { return null }
}

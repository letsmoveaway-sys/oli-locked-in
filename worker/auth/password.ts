const encoder = new TextEncoder()
const DEFAULT_ITERATIONS = 100_000

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null
  const output = new Uint8Array(value.length / 2)
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  }
  return output
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left[index]! ^ right[index]!
  return difference === 0
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as ArrayBuffer, iterations },
    key,
    256,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(
  password: string,
  salt = crypto.getRandomValues(new Uint8Array(16)),
  iterations = DEFAULT_ITERATIONS,
): Promise<string> {
  const hash = await derive(password, salt, iterations)
  return `pbkdf2-sha256$${iterations}$${bytesToHex(salt)}$${bytesToHex(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterationText, saltText, hashText] = stored.split('$')
  if (algorithm !== 'pbkdf2-sha256' || !iterationText || !saltText || !hashText) return false

  const iterations = Number(iterationText)
  const salt = hexToBytes(saltText)
  const expected = hexToBytes(hashText)
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || !salt || !expected) return false

  const actual = await derive(password, salt, iterations)
  return equalBytes(actual, expected)
}

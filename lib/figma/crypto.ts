import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM. Key is a 32-byte hex string in FIGMA_TOKEN_ENCRYPTION_KEY.
// Output: base64(iv):base64(authTag):base64(ciphertext).

function getKey(): Buffer {
  const hex = process.env.FIGMA_TOKEN_ENCRYPTION_KEY
  if (!hex) throw new Error('FIGMA_TOKEN_ENCRYPTION_KEY is not set')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) {
    throw new Error('FIGMA_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
  }
  return key
}

/** Throws early (used by figma routes) if the key is missing/invalid. */
export function assertEncryptionKey(): void {
  getKey()
}

export function encryptToken(plain: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

export function decryptToken(payload: string): string {
  const key = getKey()
  const [ivB64, tagB64, ctB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed encrypted token')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(ctB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    'utf8',
  )
}

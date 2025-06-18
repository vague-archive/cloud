import { djwt, md5 } from "@deps"
import { decodeBase64, encodeBase64 } from "@std/encoding"
import { is } from "@lib"

export { decodeBase64, encodeBase64 }

//-----------------------------------------------------------------------------

export type Token = string
export type Digest = string

export function generateToken(length = 32): Token {
  const randomBytes = new Uint8Array(length)
  crypto.getRandomValues(randomBytes)
  return encodeBase64(randomBytes)
}

export async function hashToken(token: Token): Promise<Digest> {
  return await hash(decodeBase64(token))
}

export async function compareToken(digest: Digest, token: Token): Promise<boolean> {
  return digest === await hashToken(token)
}

//-----------------------------------------------------------------------------

export async function createJWT(payload: djwt.Payload, signingKey: string): Promise<string> {
  const key = await importSigningKey(signingKey)
  return await djwt.create({ alg: "HS512", typ: "JWT" }, payload, key)
}

export async function verifyJWT(jwt: string, signingKey: string): Promise<djwt.Payload | "invalid-signature"> {
  const key = await importSigningKey(signingKey)
  try {
    return await djwt.verify(jwt, key)
  } catch {
    return "invalid-signature"
  }
}

export function isJWT(jwt: string): boolean {
  try {
    djwt.decode(jwt)
    return true
  } catch {
    return false
  }
}

//-----------------------------------------------------------------------------

// https://medium.com/@tony.infisical/guide-to-web-crypto-api-for-encryption-decryption-1a2c698ebc25

export async function encrypt(plaintext: string, key: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encodedPlaintext = new TextEncoder().encode(plaintext)
  const encryptKey = await importEncryptKey(key)
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encryptKey, encodedPlaintext)
  return {
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(ciphertext),
  }
}

export async function decrypt(ciphertext: string, iv: string, key: string) {
  const encryptKey = await importEncryptKey(key)
  const cleartext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decodeBase64(iv),
    },
    encryptKey,
    decodeBase64(ciphertext),
  )
  return new TextDecoder().decode(cleartext)
}

//-----------------------------------------------------------------------------

export async function generateSigningKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-512" },
    true,
    ["sign", "verify"],
  )
}

export async function exportSigningKey(key: CryptoKey): Promise<string> {
  const bytes = await crypto.subtle.exportKey("raw", key)
  return encodeBase64(bytes)
}

export async function importSigningKey(key: string): Promise<CryptoKey> {
  const bytes = decodeBase64(key)
  return await crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "HMAC", hash: "SHA-512" },
    true,
    ["sign", "verify"],
  )
}

//-----------------------------------------------------------------------------

export async function generateEncryptKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  )
}

export async function exportEncryptKey(key: CryptoKey): Promise<string> {
  const bytes = await crypto.subtle.exportKey("raw", key)
  return encodeBase64(bytes)
}

export async function importEncryptKey(key: string): Promise<CryptoKey> {
  const bytes = decodeBase64(key)
  return await crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  )
}

//-----------------------------------------------------------------------------

type HashAlgorithm = "SHA-256" | "MD5"

export async function hash(value: string | Uint8Array, algorithm: HashAlgorithm = "SHA-256") {
  if (algorithm === "MD5") {
    return await md5(value) // web crypto doesn't support MD5, so get implementation from hash-wasm library
  } else {
    const bytes = is.string(value) ? new TextEncoder().encode(value) : value
    const buffer = await crypto.subtle.digest(algorithm, bytes)
    const output = new Uint8Array(buffer)
    return hexdigest(output)
  }
}

export function hexdigest(bytes: Uint8Array) {
  const array = Array.from(bytes)
  return array.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function hexbinary(hex: string) {
  const length = hex.length / 2
  const binaryArray = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    const byteHex = hex.substring(i * 2, i * 2 + 2)
    binaryArray[i] = parseInt(byteHex, 16)
  }
  return binaryArray
}

//-----------------------------------------------------------------------------

export async function base64md5(content: string | Uint8Array) {
  // AWS requires a base64 encoding of md5 bytes (not the hexdigest)
  // EG.
  //   echo -n "content" | md5sum | awk '{print $1}' | xxd -r -p | base64
  const md5: string = await hash(content, "MD5")
  const bytes: Uint8Array = hexbinary(md5)
  const b64: string = encodeBase64(bytes)
  return b64
}

//-----------------------------------------------------------------------------

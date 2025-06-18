import { assert, Test } from "@test"

import {
  base64md5,
  compareToken,
  createJWT,
  decrypt,
  encrypt,
  exportEncryptKey,
  exportSigningKey,
  generateEncryptKey,
  generateSigningKey,
  generateToken,
  hash,
  hashToken,
  importEncryptKey,
  importSigningKey,
  isJWT,
  verifyJWT,
} from "./crypto.ts"

//-----------------------------------------------------------------------------

Test("hash string (defaults to SHA-256)", async () => {
  // SHA-256 hash
  assert.equals(
    await hash("hello", "SHA-256"),
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  )
  assert.equals(
    await hash("world", "SHA-256"),
    "486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7",
  )

  // MD5 hash
  assert.equals(await hash("hello", "MD5"), "5d41402abc4b2a76b9719d911017c592")
  assert.equals(await hash("world", "MD5"), "7d793037a0760186574b0282f2f435e7")

  // defaults to SHA-256 if no algorithm specified
  assert.equals(await hash("hello"), await hash("hello", "SHA-256"))
  assert.equals(await hash("world"), await hash("world", "SHA-256"))

  // can pass either string or bytes
  assert.equals(await hash("hello"), await hash(new TextEncoder().encode("hello")))
  assert.equals(await hash("world"), await hash(new TextEncoder().encode("world")))
})

//-----------------------------------------------------------------------------

Test("generate a random token", () => {
  const token = generateToken()
  assert.isString(token)
  assert.equals(token.length, 44) // 32 bytes plus base64 encoding overhead
})

Test("generate a longer random token", () => {
  const token = generateToken(100)
  assert.isString(token)
  assert.equals(token.length, 136) // 100 bytes plus base64 encoding overhead
})

Test("tokens are unique", () => {
  const t1 = generateToken()
  const t2 = generateToken()
  const t3 = generateToken()
  assert.notEquals(t1, t2)
  assert.notEquals(t1, t3)
  assert.notEquals(t2, t3)
})

//-----------------------------------------------------------------------------

Test("hash a token and compare the digests to the original token", async () => {
  const t1 = generateToken()
  const t2 = generateToken()
  const t3 = generateToken()

  const d1 = await hashToken(t1)
  const d2 = await hashToken(t2)

  assert.equals(await compareToken(d1, t1), true)
  assert.equals(await compareToken(d1, t2), false)
  assert.equals(await compareToken(d1, t3), false)
  assert.equals(await compareToken(d1, ""), false)
  assert.equals(await compareToken(d1, "foo"), false)
  assert.equals(await compareToken(d1, "bar"), false)

  assert.equals(await compareToken(d2, t1), false)
  assert.equals(await compareToken(d2, t2), true)
  assert.equals(await compareToken(d2, t3), false)
  assert.equals(await compareToken(d2, "foo"), false)
  assert.equals(await compareToken(d2, "bar"), false)
})

//-----------------------------------------------------------------------------

Test("generate a signing key", async () => {
  const key: CryptoKey = await generateSigningKey()
  assert.equals(key.algorithm.name, "HMAC")
  assert.equals(key.extractable, true)
  assert.equals(key.type, "secret")
  assert.equals(key.usages, ["sign", "verify"])
})

Test("export and import signing keys", async () => {
  const key: CryptoKey = await generateSigningKey()

  const exported = await exportSigningKey(key)
  assert.isString(exported)
  assert.equals(exported.length, 172)

  const imported = await importSigningKey(exported)
  assert.equals(imported, key)
})

//-----------------------------------------------------------------------------

Test("generate an encryption key", async () => {
  const key: CryptoKey = await generateEncryptKey()
  assert.equals(key.algorithm.name, "AES-GCM")
  assert.equals(key.extractable, true)
  assert.equals(key.type, "secret")
  assert.equals(key.usages, ["encrypt", "decrypt"])
})

Test("export and import encryption key", async () => {
  const key: CryptoKey = await generateEncryptKey()

  const exported = await exportEncryptKey(key)
  assert.isString(exported)
  assert.equals(exported.length, 44)

  const imported = await importEncryptKey(exported)
  assert.equals(imported, key)
})

//-----------------------------------------------------------------------------

Test("create and verify a JWT using a signing key", async () => {
  const signingKey = "secretz"
  const payload = { user: "jake" }
  const jwt = await createJWT(payload, signingKey)
  assert.isString(jwt)
  const verified = await verifyJWT(jwt, signingKey)
  assert.equals(verified, payload)
})

//-----------------------------------------------------------------------------

Test("cannot verify without the signing key", async () => {
  const payload = { user: "jake" }
  const jwt = await createJWT(payload, "secretz")
  const result = await verifyJWT(jwt, "not the secret")
  assert.equals(result, "invalid-signature")
})

//-----------------------------------------------------------------------------

Test("encrypt and decrypt using an encryption key", async () => {
  const key = await exportEncryptKey(await generateEncryptKey())

  const source = "Shhh, this is a secret!"
  const { ciphertext, iv } = await encrypt(source, key)

  const target = await decrypt(ciphertext, iv, key)
  assert.equals(target, source)

  assert.notEquals(ciphertext, source)
  assert.notEquals(ciphertext, iv)
  assert.notEquals(iv, source)
})

//-----------------------------------------------------------------------------

Test("can tell if a token is a JWT or not", async () => {
  const signingKey = "secretz"
  const jwt1 = await createJWT({ user: "jake" }, signingKey)
  const jwt2 = await createJWT({ user: "amy" }, signingKey)
  const token = generateToken()

  assert.equals(isJWT(jwt1), true)
  assert.equals(isJWT(jwt2), true)
  assert.equals(isJWT(token), false)
  assert.equals(isJWT(""), false)
  assert.equals(isJWT("yolo"), false)
})

//-----------------------------------------------------------------------------

Test("base 64 encoded md5 hash (for AWS)", async () => {
  assert.equals(await base64md5("hello"), "XUFAKrxLKna5cZ2REBfFkg==")
  assert.equals(await base64md5("world"), "fXkwN6B2AYZXSwKC8vQ15w==")
})

//-----------------------------------------------------------------------------

import { crypto } from "@lib"

export async function generateSigningKey() {
  const key = await crypto.generateSigningKey()
  const encoded = await crypto.exportSigningKey(key)
  console.log(encoded)
}

export async function generateEncryptKey() {
  const key = await crypto.generateEncryptKey()
  const encoded = await crypto.exportEncryptKey(key)
  console.log(encoded)
}

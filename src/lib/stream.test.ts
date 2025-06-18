import { assert, Test } from "@test"
import { join } from "@std/path"
import { StreamReader, streamToBuffer, streamToString } from "./stream.ts"

//-----------------------------------------------------------------------------

Test.tmp("streamToString and streamToBuffer", async ({ tmpDir }) => {
  const path = join(tmpDir, "file.txt")
  await Deno.writeTextFile(path, "hello world")

  const file1 = await Deno.open(path)
  const content = await streamToString(file1.readable)
  assert.equals(content, "hello world")

  const file2 = await Deno.open(path)
  const buffer = await streamToBuffer(file2.readable)
  assert.equals(new TextDecoder().decode(buffer), "hello world")
})

//-----------------------------------------------------------------------------

Test.tmp("StreamReader - file size 10, buffer size 20", async ({ tmpDir }) => {
  const path = join(tmpDir, "file.txt")
  await Deno.writeTextFile(path, "1234567890")

  const file = await Deno.open(path)
  const reader = new StreamReader(file.readable.getReader())
  const buffer = new Uint8Array(20)
  const encoder = new TextEncoder()

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 10)
  assert.equals(buffer, encoder.encode("1234567890xxxxxxxxxx"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), null)
  assert.equals(await reader.read(buffer), null)
  assert.equals(buffer, encoder.encode("xxxxxxxxxxxxxxxxxxxx"))
})

//-----------------------------------------------------------------------------

Test.tmp("StreamReader - file size 10, buffer size 10", async ({ tmpDir }) => {
  const path = join(tmpDir, "file.txt")
  await Deno.writeTextFile(path, "1234567890")

  const file = await Deno.open(path)
  const reader = new StreamReader(file.readable.getReader())
  const buffer = new Uint8Array(10)
  const encoder = new TextEncoder()

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 10)
  assert.equals(buffer, encoder.encode("1234567890"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 0)
  assert.equals(await reader.read(buffer), null)
  assert.equals(buffer, encoder.encode("xxxxxxxxxx"))
})

//-----------------------------------------------------------------------------

Test.tmp("StreamReader - file size 10, buffer size 5", async ({ tmpDir }) => {
  const path = join(tmpDir, "file.txt")
  await Deno.writeTextFile(path, "1234567890")

  const file = await Deno.open(path)
  const reader = new StreamReader(file.readable.getReader())
  const buffer = new Uint8Array(5)
  const encoder = new TextEncoder()

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 5)
  assert.equals(buffer, encoder.encode("12345"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 5)
  assert.equals(buffer, encoder.encode("67890"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), null)
  assert.equals(await reader.read(buffer), null)
  assert.equals(buffer, encoder.encode("xxxxx"))
})

//-----------------------------------------------------------------------------

Test.tmp("StreamReader - file size 10, buffer size 4", async ({ tmpDir }) => {
  const path = join(tmpDir, "file.txt")
  await Deno.writeTextFile(path, "1234567890")

  const file = await Deno.open(path)
  const reader = new StreamReader(file.readable.getReader())
  const buffer = new Uint8Array(4)
  const encoder = new TextEncoder()

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 4)
  assert.equals(buffer, encoder.encode("1234"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 4)
  assert.equals(buffer, encoder.encode("5678"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 2)
  assert.equals(buffer, encoder.encode("90xx"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), null)
  assert.equals(await reader.read(buffer), null)
  assert.equals(await reader.read(buffer), null)
  assert.equals(buffer, encoder.encode("xxxx"))
})

//-----------------------------------------------------------------------------

Test.tmp("StreamReader - file size 10, buffer size 3", async ({ tmpDir }) => {
  const path = join(tmpDir, "file.txt")
  await Deno.writeTextFile(path, "1234567890")

  const file = await Deno.open(path)
  const reader = new StreamReader(file.readable.getReader())
  const buffer = new Uint8Array(3)
  const encoder = new TextEncoder()

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 3)
  assert.equals(buffer, encoder.encode("123"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 3)
  assert.equals(buffer, encoder.encode("456"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 3)
  assert.equals(buffer, encoder.encode("789"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), 1)
  assert.equals(buffer, encoder.encode("0xx"))

  buffer.fill("x".charCodeAt(0))
  assert.equals(await reader.read(buffer), null)
  assert.equals(await reader.read(buffer), null)
  assert.equals(buffer, encoder.encode("xxx"))
})

//-----------------------------------------------------------------------------

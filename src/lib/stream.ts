import { Reader } from "@std/io"

// NOTE: Deno is moving towards using WEB streams APIs (https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
// ... however, their standard library archive module is still using the old Deno.Reader interface
// for the `Tar` and `UnTar` modules, so we need to implement a `StreamReader` that wraps a
// `ReadableStreamDefaultReader` and implements the older `Reader` interface...
//
// ... and whether it's node or deno, javascript streams are *still* a PITA
//

export class StreamReader implements Reader {
  private reader: ReadableStreamDefaultReader<Uint8Array>
  private buffer: Uint8Array | undefined

  constructor(reader: ReadableStreamDefaultReader<Uint8Array>) {
    this.reader = reader
  }

  async read(p: Uint8Array): Promise<number | null> {
    if (this.buffer && this.buffer.length > p.length) {
      p.set(this.buffer.subarray(0, p.length))
      this.buffer = this.buffer.subarray(p.length)
      return p.length
    }

    if (this.buffer && this.buffer.length <= p.length) {
      const count = this.buffer.length
      p.set(this.buffer)
      this.buffer = undefined
      return count
    }

    const { done, value } = await this.reader.read()
    if (done) {
      return null
    }

    if (p.length > value.length) {
      p.set(value)
      return value.length
    } else {
      p.set(value.subarray(0, p.length))
      this.buffer = value.subarray(p.length)
      return p.length
    }
  }
}

//-------------------------------------------------------------------------------------------------

export async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
  }
  reader.releaseLock()
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const buffer = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }
  return buffer
}

export async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder()
  const buffer = await streamToBuffer(stream)
  return decoder.decode(buffer)
}

//-------------------------------------------------------------------------------------------------

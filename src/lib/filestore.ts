import { z } from "@deps"
import { assert } from "@lib"
import { Status } from "@lib/http"

//-------------------------------------------------------------------------------------------------

export interface FileStoreStats {
  root: string
  count: number
  bytes: number
}

//-------------------------------------------------------------------------------------------------

type Content = Uint8Array | ReadableStream<Uint8Array>

export class FileStore {
  readonly endpoint: URL

  constructor(endpoint: URL) {
    this.endpoint = endpoint
  }

  url(path: string) {
    return new URL(path, this.endpoint)
  }

  async ls(path: string) {
    return await fetch(this.url(path), {
      method: "GET",
      headers: { "x-command": "ls" },
    })
  }

  async load(path: string, headers?: Headers) {
    return await fetch(this.url(path), {
      method: "GET",
      headers,
    })
  }

  async save(path: string, body: Content, headers?: Headers) {
    return await fetch(this.url(path), {
      method: "POST",
      headers,
      body,
    })
  }

  async delete(path: string) {
    return await fetch(this.url(path), {
      method: "DELETE",
    })
  }

  async rmdir(path: string) {
    return await fetch(this.url(path), {
      method: "DELETE",
      headers: { "x-command": "rmdir" },
    })
  }

  async stats() {
    const response = await fetch(this.url("/stats"))
    assert.true(response.status === Status.OK)
    return z.object({
      local: z.object({
        root: z.string(),
        count: z.number(),
        bytes: z.number(),
      }),
      s3: z.object({
        bucket: z.string(),
        count: z.number(),
        bytes: z.number(),
      }).optional(),
    }).parse(await response.json())
  }

  async diff() {
    const response = await fetch(this.url("/diff"))
    assert.true(response.status === Status.OK)
    return z.object({
      root: z.string(),
      bucket: z.string(),
      missingLocal: z.array(z.string()),
      missingRemote: z.array(z.string()),
    }).parse(await response.json())
  }
}

//-------------------------------------------------------------------------------------------------

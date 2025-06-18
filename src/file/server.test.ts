import { join } from "@std/path"
import { Buffer, readAll } from "@std/io"
import { Tar } from "@std/archive"
import { assert, bypass, MockMinionsQueue, Test } from "@test"
import { AWS } from "@lib/aws"
import { ContentType, Header, Status, StatusText } from "@lib/http"
import { streamToBuffer } from "@lib/stream"
import { FileServer } from "./server.ts"

//-------------------------------------------------------------------------------------------------

const host = "localhost"
const port = 8080
const signingKey = "my-signing-key"
const bucket = "my-bucket"
const path = "foo/bar/readme.txt"
const content = "hello world"

//-------------------------------------------------------------------------------------------------

Test.tmp("Load, Save, and Delete Files", async ({ tmpDir }) => {
  const minions = MockMinionsQueue()

  const fs = new FileServer({
    host,
    port,
    root: tmpDir,
    signingKey,
    minions,
  })

  let request = new Request(path)
  let response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), StatusText[Status.NotFound])

  request = new Request(path, { method: "POST", body: content })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "saved")

  request = new Request(path)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(response.headers.get(Header.ContentType), "text/plain; charset=UTF-8")
  assert.equals(await response.text(), content)

  request = new Request(path, { method: "DELETE" })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), `${path} deleted`)

  request = new Request(path)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), StatusText[Status.NotFound])

  assert.noMinions(minions)
})

//-------------------------------------------------------------------------------------------------

Test.tmp("List Directory", async ({ tmpDir }) => {
  const minions = MockMinionsQueue()

  const fs = new FileServer({
    host,
    port,
    root: tmpDir,
    signingKey,
    minions,
  })

  const folder1 = "foo/bar"
  const folder2 = "foo/baz"

  const path1 = `${folder1}/first.txt`
  const path2 = `${folder1}/second.txt`
  const path3 = `${folder2}/third.txt`

  let request = new Request(path1, { method: "POST", body: "first" })
  let response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)

  request = new Request(path2, { method: "POST", body: "second" })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)

  request = new Request(path3, { method: "POST", body: "third" })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)

  request = new Request(folder1, { method: "GET", headers: { "x-command": "ls" } })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.json(), [
    "first.txt",
    "second.txt",
  ])

  request = new Request(folder2, { method: "GET", headers: { "x-command": "ls" } })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.json(), [
    "third.txt",
  ])

  request = new Request("foo", { method: "GET", headers: { "x-command": "ls" } })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.json(), [
    "bar/first.txt",
    "bar/second.txt",
    "baz/third.txt",
  ])
})

//-------------------------------------------------------------------------------------------------

Test.tmp("Ping", async ({ tmpDir }) => {
  const minions = MockMinionsQueue()
  const fs = new FileServer({
    host,
    port,
    root: tmpDir,
    signingKey,
    minions,
  })
  const request = new Request("/ping")
  const response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "pong")
})

//-------------------------------------------------------------------------------------------------

Test.tmp("Stats", async ({ tmpDir }) => {
  const minions = MockMinionsQueue()

  const fs = new FileServer({
    host,
    port,
    root: tmpDir,
    signingKey,
    minions,
  })

  const folder1 = "foo/bar"
  const folder2 = "foo/baz"

  const content1 = "first"
  const content2 = "second"
  const content3 = "third"

  const path1 = `${folder1}/first.txt`
  const path2 = `${folder1}/second.txt`
  const path3 = `${folder2}/third.txt`

  let request = new Request(path1, { method: "POST", body: content1 })
  let response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)

  request = new Request(path2, { method: "POST", body: content2 })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)

  request = new Request(path3, { method: "POST", body: content3 })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)

  request = new Request("/stats")
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(response.headers.get(Header.ContentType), ContentType.Json)
  const jsonResponse = await response.json()
  assert.equals(jsonResponse.local.root, tmpDir)
  assert.equals(jsonResponse.local.count, 3)
  // Give this assertion a large range (4kb - ~40kb) to account for how different operating systems allocate small files
  assert.almostEquals(
    jsonResponse.local.bytes,
    20 * 1024,
    19 * 1024,
  )
  assert.equals(jsonResponse.s3, undefined)
})

//-------------------------------------------------------------------------------------------------

Test.tmp("Load, Save, and Delete Files WITH S3 FALLBACK", async ({ tmpDir }) => {
  const minions = MockMinionsQueue()

  const aws = new AWS({
    region: "us-west-2",
    credentials: {
      awsAccessKeyId: "my-access-key-id",
      awsSecretKey: "my-secret-key",
    },
  })

  const fs = new FileServer({
    host,
    port,
    root: tmpDir,
    signingKey,
    bucket,
    aws,
    minions,
  })

  const server = bypass.server(
    bypass.handler.get(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/${path}`,
      () => {
        return new Response("<Error><Code>NoSuchKey</Code></Error>", {
          status: 404,
          headers: { "Content-Type": "application/xml" },
        })
      },
    ),
  )
  server.listen()

  let request = new Request(path)
  let response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), StatusText[Status.NotFound])

  request = new Request(path, { method: "POST", body: content })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "saved")

  assert.minion(minions, { name: "s3:upload", path, bucket })

  request = new Request(path)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(response.headers.get(Header.ContentType), "text/plain; charset=UTF-8")
  assert.equals(await response.text(), content)

  request = new Request(path, { method: "DELETE" })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), `${path} deleted`)

  assert.minion(minions, { name: "s3:delete", path, bucket })

  request = new Request(path)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), StatusText[Status.NotFound])

  assert.noMinions(minions)

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test.tmp("Delete file vs directory - enqueue s3 delete vs rmdir job", async ({ tmpDir }) => {
  const minions = MockMinionsQueue()

  const aws = new AWS({
    region: "us-west-2",
    credentials: {
      awsAccessKeyId: "my-access-key-id",
      awsSecretKey: "my-secret-key",
    },
  })

  const fs = new FileServer({
    host,
    port,
    root: tmpDir,
    signingKey,
    bucket,
    aws,
    minions,
  })

  const dir = "foo/bar"
  const first = `${dir}/first.txt`
  const second = `${dir}/second.txt`

  const server = bypass.server(
    bypass.handler.get(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/${first}`,
      () => {
        return new Response("<Error><Code>NoSuchKey</Code></Error>", {
          status: 404,
          headers: { "Content-Type": "application/xml" },
        })
      },
    ),
    bypass.handler.get(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/${second}`,
      () => {
        return new Response("<Error><Code>NoSuchKey</Code></Error>", {
          status: 404,
          headers: { "Content-Type": "application/xml" },
        })
      },
    ),
  )
  server.listen()

  let request = new Request(first, { method: "POST", body: "first item" })
  let response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "saved")

  assert.minion(minions, { name: "s3:upload", path: first, bucket })

  request = new Request(second, { method: "POST", body: "second item" })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "saved")

  assert.minion(minions, { name: "s3:upload", path: second, bucket })

  request = new Request(first)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "first item")

  request = new Request(second)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "second item")

  request = new Request(first, { method: "DELETE" })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), `foo/bar/first.txt deleted`)

  assert.minion(minions, { name: "s3:delete", path: first, bucket })

  request = new Request(dir, { method: "DELETE", headers: { "x-command": "rmdir" } })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), `foo/bar deleted`)

  assert.minion(minions, { name: "s3:rmdir", path: dir, bucket })

  request = new Request(first)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), StatusText[Status.NotFound])

  request = new Request(second)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), StatusText[Status.NotFound])

  assert.noMinions(minions)
  server.close()
})

//-------------------------------------------------------------------------------------------------

Test.tmp("Load look in S3 when file not found (if aws/bucket are provided)", async ({ tmpDir }) => {
  const minions = MockMinionsQueue()

  const aws = new AWS({
    region: "us-west-2",
    credentials: {
      awsAccessKeyId: "my-access-key-id",
      awsSecretKey: "my-secret-key",
    },
  })

  const fs = new FileServer({
    host,
    port,
    root: tmpDir,
    signingKey,
    bucket,
    aws,
    minions,
  })

  const server = bypass.server(
    bypass.handler.get(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/${path}`,
      () => {
        return new Response(content, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        })
      },
    ),
  )
  server.listen()

  const request = new Request(path)
  const response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), content)

  assert.noMinions(minions)

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test.tmp("extract archive", async ({ tmpDir }) => {
  const minions = MockMinionsQueue()

  const aws = new AWS({
    region: "us-west-2",
    credentials: {
      awsAccessKeyId: "my-access-key-id",
      awsSecretKey: "my-secret-key",
    },
  })

  const fs = new FileServer({
    host,
    port,
    root: tmpDir,
    signingKey,
    bucket,
    aws,
    minions,
  })

  const path = "foo/bar"
  const tar = await makeTgz([
    ["folder/first.txt", "first item"],
    ["folder/second.txt", "second item"],
  ])

  let request = new Request(path, {
    method: "POST",
    body: tar,
    headers: {
      "x-command": "extract",
    },
  })
  let response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), `${path} archive extracted`)

  request = new Request(`${path}/folder/first.txt`)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "first item")

  request = new Request(`${path}/folder/second.txt`)
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "second item")

  assert.minion(minions, {
    name: "s3:upload:bulk",
    paths: [
      "foo/bar/folder/first.txt",
      "foo/bar/folder/second.txt",
      "foo/bar/void.manifest.json",
    ],
    bucket,
  })
  assert.noMinions(minions)
})

//-------------------------------------------------------------------------------------------------

Test.tmp("Load respects IfModifiedSince", async ({ tmpDir }) => {
  const minions = MockMinionsQueue()
  const fs = new FileServer({
    host,
    port,
    root: tmpDir,
    signingKey,
    minions,
  })

  const path = "readme.txt"
  const filename = join(tmpDir, path)
  await Deno.writeTextFile(filename, content)
  const info = await Deno.stat(filename)
  const lastModified = info.mtime
  assert.present(lastModified)

  const justBefore = new Date(lastModified)
  const justAfter = new Date(lastModified)

  justBefore.setMinutes(lastModified.getMinutes() - 1)
  justAfter.setMinutes(lastModified.getMinutes() + 1)

  // request without IfModifiedSince should return content
  let request = new Request(path)
  let response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), content)

  // request with IfModifiedSince BEFORE mtime should return 200 OK (plus content)
  request = new Request(path, {
    headers: {
      [Header.IfModifiedSince]: justBefore.toString(),
    },
  })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), content)

  // request with IfModifiedSince AFTER mtime should return 304 NotModified (and no content)
  request = new Request(path, {
    headers: {
      [Header.IfModifiedSince]: justAfter.toString(),
    },
  })
  response = await fs.handle(request)
  assert.present(response)
  assert.equals(response.status, Status.NotModified)
  assert.equals(response.body, null)
})

//-------------------------------------------------------------------------------------------------

async function makeTgz(items: [string, string][]) {
  const tar = new Tar()

  for (const [path, content] of items) {
    const buffer = new TextEncoder().encode(content)
    tar.append(path, {
      reader: new Buffer(buffer),
      contentSize: buffer.byteLength,
    })
  }

  const reader = tar.getReader()
  const data = await readAll(reader)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })

  return streamToBuffer(stream.pipeThrough(new CompressionStream("gzip")))
}

//-------------------------------------------------------------------------------------------------

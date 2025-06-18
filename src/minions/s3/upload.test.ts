import { assert, bypass, Test, testMinionsContext } from "@test"
import { crypto } from "@lib"
import { S3Upload, S3UploadBulk, S3UploadBulkData, S3UploadData } from "./upload.ts"

//-------------------------------------------------------------------------------------------------

Test.domain("upload", async ({ domain, clock }) => {
  const content = "hello world"
  const bucket = "my-bucket"
  const path = "foo/bar/readme.txt"
  const data = { name: "s3:upload", bucket, path } as S3UploadData
  const context = testMinionsContext(domain)

  let uploaded: string | undefined
  const server = bypass.server(
    bypass.handler.get(`${domain.filestore.endpoint.href}${path}`, () => new Response(content)),
    bypass.handler.head(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/${path}`,
      () => new Response("", { status: 404 }),
    ),
    bypass.handler.put(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/${path}`,
      async ({ request }) => {
        assert.present(request.body)
        uploaded = await request.text()
        return bypass.json({})
      },
    ),
  )
  server.listen()

  const result = await S3Upload(data, context)

  assert.equals(result.bucket, bucket)
  assert.equals(result.path, path)
  assert.equals(result.uploadedOn, clock.now)
  assert.equals(uploaded, content)

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test.domain("upload - already exists", async ({ domain }) => {
  const content = "hello world"
  const bucket = "my-bucket"
  const path = "foo/bar/readme.txt"
  const data = { name: "s3:upload", bucket, path } as S3UploadData
  const context = testMinionsContext(domain)
  const previously = new Date("2024-01-01")
  const etag = await crypto.hash(content, "MD5")

  const server = bypass.server(
    bypass.handler.get(`${domain.filestore.endpoint.href}${path}`, () => new Response(content)),
    bypass.handler.head(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/${path}`,
      () => {
        return new Response(undefined, {
          status: 200,
          headers: {
            "ETag": `"${etag}"`,
            "Content-Length": content.length.toString(),
            "Last-Modified": previously.toISOString(),
          },
        })
      },
    ),
  )
  server.listen()

  const result = await S3Upload(data, context)

  assert.equals(result.bucket, bucket)
  assert.equals(result.path, path)
  assert.equals(result.uploadedOn, previously)

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test.domain("upload bulk - break into chunks", async ({ domain }) => {
  const bucket = "my-bucket"
  const concurrency = 3
  const paths = [
    "first.txt",
    "second.txt",
    "third.txt",
    "fourth.txt",
    "fifth.txt",
    "sixth.txt",
  ]
  const data = { name: "s3:upload:bulk", bucket, paths, shuffle: false, concurrency } as S3UploadBulkData
  const context = testMinionsContext(domain)

  const result = await S3UploadBulk(data, context)
  assert.equals(result, {
    bucket,
    concurrency,
    chunks: [
      ["first.txt", "second.txt"],
      ["third.txt", "fourth.txt"],
      ["fifth.txt", "sixth.txt"],
    ],
  })
})

//-------------------------------------------------------------------------------------------------

Test.domain("upload bulk - single chunk", async ({ domain }) => {
  const bucket = "my-bucket"
  const paths = [
    "first.txt",
    "second.txt",
  ]
  const data = { name: "s3:upload:bulk", bucket, paths, concurrency: 1 } as S3UploadBulkData
  const context = testMinionsContext(domain)

  let first: string | undefined
  let second: string | undefined

  const server = bypass.server(
    bypass.handler.get(`${domain.filestore.endpoint.href}first.txt`, () => new Response("first")),
    bypass.handler.head(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/first.txt`,
      () => new Response("", { status: 404 }),
    ),
    bypass.handler.put(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/first.txt`,
      async ({ request }) => {
        assert.present(request.body)
        first = await request.text()
        return bypass.json({})
      },
    ),
    bypass.handler.get(`${domain.filestore.endpoint.href}second.txt`, () => new Response("second")),
    bypass.handler.head(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/second.txt`,
      () => new Response("", { status: 404 }),
    ),
    bypass.handler.put(
      `https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/second.txt`,
      async ({ request }) => {
        assert.present(request.body)
        second = await request.text()
        return bypass.json({})
      },
    ),
  )
  server.listen()

  const result = await S3UploadBulk(data, context)
  assert.equals(result, {
    bucket,
    uploaded: [
      "first.txt",
      "second.txt",
    ],
    unmodified: [],
    missing: [],
  })

  assert.present(first)
  assert.present(second)

  assert.equals(first, "first")
  assert.equals(second, "second")

  server.close()
})

//-------------------------------------------------------------------------------------------------

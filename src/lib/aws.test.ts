import { outdent } from "@deps"
import { assert, bypass, Test } from "@test"
import { AWS, encodeS3Key } from "@lib/aws"
import { streamToString } from "@lib/stream"
import { ContentType, Header } from "@lib/http"

const CONTENT = "Hello, World!"
const CONFIG = {
  region: "us-west-2",
  credentials: {
    awsAccessKeyId: "my-access-key-id",
    awsSecretKey: "my-secret-key",
  },
}

//-------------------------------------------------------------------------------------------------

Test("s3HeadObject", async () => {
  const server = bypass.server(
    bypass.handler.head("https://my-bucket.s3.dualstack.us-west-2.amazonaws.com/path/to/hello.txt", () => {
      return new Response("", {
        status: 200,
        headers: {
          "Content-Length": "100",
          "Content-Type": "text/html",
          "ETag": "abc",
        },
      })
    }),
  )
  server.listen()

  const aws = new AWS(CONFIG)
  const result = await aws.s3HeadObject({
    bucket: "my-bucket",
    key: "path/to/hello.txt",
  })

  assert.present(result)
  assert.equals(result.ContentType, "text/html")
  assert.equals(result.ContentLength, 100)
  assert.equals(result.ETag, "abc")

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test("s3GetObject", async () => {
  const server = bypass.server(
    bypass.handler.get("https://my-bucket.s3.dualstack.us-west-2.amazonaws.com/path/to/hello.txt", () => {
      return new Response(CONTENT, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      })
    }),
  )
  server.listen()

  const aws = new AWS(CONFIG)
  const s3Object = await aws.s3GetObject({
    bucket: "my-bucket",
    key: "path/to/hello.txt",
  })

  assert.present(s3Object)
  assert.present(s3Object.Body)
  assert.equals(s3Object.ContentType, "text/plain")
  assert.equals(await streamToString(s3Object.Body), CONTENT)

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test("s3PutObject", async () => {
  let requestContentType: string | null = null
  let requestContentLength: string | null = null
  let requestBody: string | null = null

  const server = bypass.server(
    bypass.handler.put(
      "https://my-bucket.s3.dualstack.us-west-2.amazonaws.com/path/to/hello.txt",
      async ({ request }) => {
        requestContentType = request.headers.get(Header.ContentType)
        requestContentLength = request.headers.get(Header.ContentLength)
        requestBody = await streamToString(request.body!)
        return bypass.json({})
      },
    ),
  )
  server.listen()

  const aws = new AWS(CONFIG)

  await aws.s3PutObject({
    bucket: "my-bucket",
    key: "path/to/hello.txt",
    content: new TextEncoder().encode(CONTENT),
    contentType: ContentType.Text,
  })

  assert.equals(requestContentType, ContentType.Text)
  assert.equals(requestContentLength, CONTENT.length.toString())
  assert.equals(requestBody, CONTENT)

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test("s3ListObjects", async () => {
  const server = bypass.server(
    bypass.handler.get("https://my-bucket.s3.dualstack.us-west-2.amazonaws.com/", ({ request }) => {
      const url = new URL(request.url)
      const prefix = url.searchParams.get("prefix")
      return new Response(
        `
        <ListBucketResult>
          <Prefix>${prefix}</Prefix>
          <Contents><Key>${prefix}/first</Key></Contents>
          <Contents><Key>${prefix}/second</Key></Contents>
          <Contents><Key>${prefix}/third</Key></Contents>
        </ListBucketResult>
      `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml",
          },
        },
      )
    }),
  )
  server.listen()

  const aws = new AWS(CONFIG)
  const result = await aws.s3ListObjects({
    bucket: "my-bucket",
    prefix: "path/to/somewhere",
  })

  assert.present(result)
  assert.equals(result.Prefix, "path/to/somewhere")
  assert.equals(result.Contents.length, 3)
  assert.equals(result.Contents[0].Key, "path/to/somewhere/first")
  assert.equals(result.Contents[1].Key, "path/to/somewhere/second")
  assert.equals(result.Contents[2].Key, "path/to/somewhere/third")

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test("s3AllKeys", async () => {
  const server = bypass.server(
    bypass.handler.get("https://my-bucket.s3.dualstack.us-west-2.amazonaws.com/", ({ request }) => {
      const url = new URL(request.url)
      const prefix = url.searchParams.get("prefix")
      const continuation = url.searchParams.get("continuation-token")
      if (continuation === "AGAIN") {
        return new Response(`
          <ListBucketResult>
            <Prefix>${prefix}</Prefix>
            <IsTruncated>false</IsTruncated>
            <Contents><Key>${prefix}/fourth</Key></Contents>
            <Contents><Key>${prefix}/fifth</Key></Contents>
          </ListBucketResult>
        `, { status: 200, headers: { "Content-Type": "text/xml" } })
      } else {
        return new Response(`
          <ListBucketResult>
            <Prefix>${prefix}</Prefix>
            <IsTruncated>true</IsTruncated>
            <NextContinuationToken>AGAIN</NextContinuationToken>
            <Contents><Key>${prefix}/first</Key></Contents>
            <Contents><Key>${prefix}/second</Key></Contents>
            <Contents><Key>${prefix}/third</Key></Contents>
          </ListBucketResult>
        `, { status: 200, headers: { "Content-Type": "text/xml" } })
      }
    }),
  )
  server.listen()

  const aws = new AWS(CONFIG)
  const result = await aws.s3AllKeys({
    bucket: "my-bucket",
    prefix: "path/to/somewhere",
  })

  assert.present(result)
  assert.equals(result.length, 5)
  assert.equals(result[0], "path/to/somewhere/first")
  assert.equals(result[1], "path/to/somewhere/second")
  assert.equals(result[2], "path/to/somewhere/third")
  assert.equals(result[3], "path/to/somewhere/fourth")
  assert.equals(result[4], "path/to/somewhere/fifth")

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test("s3Stats", async () => {
  const server = bypass.server(
    bypass.handler.get("https://my-bucket.s3.dualstack.us-west-2.amazonaws.com/", ({ request }) => {
      const url = new URL(request.url)
      const prefix = url.searchParams.get("prefix")
      const continuation = url.searchParams.get("continuation-token")
      if (continuation === "AGAIN") {
        return new Response(`
          <ListBucketResult>
            <Prefix>${prefix}</Prefix>
            <IsTruncated>false</IsTruncated>
            <Contents><Key>${prefix}/fourth</Key><Size>400</Size></Contents>
            <Contents><Key>${prefix}/fifth</Key><Size>500</Size></Contents>
          </ListBucketResult>
        `, { status: 200, headers: { "Content-Type": "text/xml" } })
      } else {
        return new Response(`
          <ListBucketResult>
            <Prefix>${prefix}</Prefix>
            <IsTruncated>true</IsTruncated>
            <NextContinuationToken>AGAIN</NextContinuationToken>
            <Contents><Key>${prefix}/first</Key><Size>100</Size></Contents>
            <Contents><Key>${prefix}/second</Key><Size>200</Size></Contents>
            <Contents><Key>${prefix}/third</Key><Size>300</Size></Contents>
          </ListBucketResult>
        `, { status: 200, headers: { "Content-Type": "text/xml" } })
      }
    }),
  )
  server.listen()

  const aws = new AWS(CONFIG)
  const result = await aws.s3Stats({
    bucket: "my-bucket",
  })

  assert.present(result)
  assert.equals(result.bucket, "my-bucket")
  assert.equals(result.count, 5)
  assert.equals(result.bytes, 1500)

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test("s3DeleteObjects", async () => {
  let input: string | undefined
  const server = bypass.server(
    bypass.handler.post("https://my-bucket.s3.dualstack.us-west-2.amazonaws.com/", async ({ request }) => {
      input = await request.text()
      return new Response(outdent`
        <DeleteResult>
          <Deleted><Key>path/to/first</Key></Deleted>
          <Deleted><Key>path/to/second</Key></Deleted>
        </DeleteResult>`)
    }),
  )
  server.listen()

  const aws = new AWS(CONFIG)
  const result = await aws.s3DeleteObjects({
    bucket: "my-bucket",
    keys: [
      "path/to/first",
      "path/to/second",
    ],
  })

  assert.equals(
    input,
    `<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>path/to/first</Key></Object><Object><Key>path/to/second</Key></Object></Delete>`,
  )

  assert.present(result)
  assert.equals(result.Deleted.length, 2)
  assert.equals(result.Deleted[0].Key, "path/to/first")
  assert.equals(result.Deleted[1].Key, "path/to/second")

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test("encodeS3Key", () => {
  assert.equals(encodeS3Key("path/to/foo.png"), "path/to/foo.png")
  assert.equals(encodeS3Key("path/to/foo bar.png"), "path/to/foo bar.png")
  assert.equals(encodeS3Key("path/to/foo bar (1).png"), "path/to/foo bar %281%29.png")
})

//-------------------------------------------------------------------------------------------------

import { outdent } from "@deps"
import { assert, bypass, Test, testMinionsContext } from "@test"
import { S3RemoveDirectory, S3RemoveDirectoryData } from "./rmdir.ts"

//-------------------------------------------------------------------------------------------------

Test.domain("rmdir", async ({ domain, clock }) => {
  const bucket = "my-bucket"
  const path = "path/to/directory"
  const data = { name: "s3:rmdir", bucket, path } as S3RemoveDirectoryData
  const context = testMinionsContext(domain)

  let deleted: string | undefined
  const server = bypass.server(
    bypass.handler.get(`https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/`, ({ request }) => {
      const prefix = new URL(request.url).searchParams.get("prefix")
      return new Response(outdent`
        <ListBucketResult>
          <Prefix>${prefix}</Prefix>
          <Contents><Key>${prefix}first</Key></Contents>
          <Contents><Key>${prefix}second</Key></Contents>
        </ListBucketResult>`)
    }),
    bypass.handler.post(`https://${bucket}.s3.dualstack.us-west-2.amazonaws.com/`, async ({ request }) => {
      deleted = await request.text()
      return new Response("<DeleteResult></DeleteResult>")
    }),
  )
  server.listen()

  const result = await S3RemoveDirectory(data, context)
  assert.equals(result.bucket, bucket)
  assert.equals(result.path, `${path}/`)
  assert.equals(result.deletedOn, clock.now)
  assert.equals(
    deleted,
    `<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>path/to/directory/first</Key></Object><Object><Key>path/to/directory/second</Key></Object></Delete>`,
  )

  server.close()
})

//-------------------------------------------------------------------------------------------------

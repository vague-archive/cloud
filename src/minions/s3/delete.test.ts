import { outdent } from "@deps"
import { assert, bypass, Test, testMinionsContext } from "@test"
import { S3Delete, S3DeleteData } from "./delete.ts"

//-------------------------------------------------------------------------------------------------

Test.domain("delete", async ({ domain, clock }) => {
  const bucket = "my-bucket"
  const path = "path/to/file.txt"
  const data = { name: "s3:delete", bucket, path } as S3DeleteData
  const context = testMinionsContext(domain)

  let deleted: string | undefined
  const server = bypass.server(
    bypass.handler.post("https://my-bucket.s3.dualstack.us-west-2.amazonaws.com/", async ({ request }) => {
      deleted = await request.text()
      return new Response(outdent`
        <DeleteResult>
          <Deleted><Key>path/to/file.txt</Key></Deleted>
        </DeleteResult>`)
    }),
  )
  server.listen()

  const result = await S3Delete(data, context)
  assert.equals(result.bucket, bucket)
  assert.equals(result.path, path)
  assert.equals(result.deletedOn, clock.now)
  assert.equals(
    deleted,
    `<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Object><Key>path/to/file.txt</Key></Object></Delete>`,
  )

  server.close()
})

//-------------------------------------------------------------------------------------------------

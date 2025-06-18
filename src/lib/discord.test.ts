import { assert, bypass, Test } from "@test"
import { discord } from "@lib"

const ACCESS_TOKEN = "mock-access-token"
const ME = "users/@me"

//-----------------------------------------------------------------------------

function apiPath(path: string) {
  return `${discord.apiEndpoint}${path}`
}

//-----------------------------------------------------------------------------

Test("apiEndpoint", () => {
  assert.instanceOf(discord.apiEndpoint, URL)
  assert.equals(discord.apiEndpoint.toString(), "https://discord.com/api/v10/")
  assert.equals(apiPath(ME), "https://discord.com/api/v10/users/@me")
})

//-----------------------------------------------------------------------------

Test("getUser", async () => {
  const server = bypass.server(
    bypass.handler.get(apiPath(ME), () =>
      bypass.json({
        id: "123",
        username: "jakesgordon",
        avatar: "123456",
        global_name: "Jake Gordon",
        email: "jakesgordon@gmail.com",
      })),
  )

  server.listen()

  const user = await discord.getAuthenticatedUser(ACCESS_TOKEN)
  assert.present(user)
  assert.equals(user.identifier, "123")
  assert.equals(user.username, "jakesgordon")
  assert.equals(user.avatar, "123456")
  assert.equals(user.name, "Jake Gordon")
  assert.equals(user.email, "jakesgordon@gmail.com")

  server.close()
})

//-----------------------------------------------------------------------------

Test("getUser missing name and email", async () => {
  const server = bypass.server(
    bypass.handler.get(apiPath(ME), () =>
      bypass.json({
        id: "123",
        username: "jakesgordon",
        avatar: "123456",
        global_name: null,
        email: null,
      })),
  )

  server.listen()

  const user = await discord.getAuthenticatedUser(ACCESS_TOKEN)
  assert.present(user)
  assert.equals(user.identifier, "123")
  assert.equals(user.username, "jakesgordon")
  assert.equals(user.avatar, "123456")
  assert.equals(user.name, "jakesgordon")
  assert.equals(user.email, undefined)

  server.close()
})

//-----------------------------------------------------------------------------

Test("getUser unexpected JSON", async () => {
  const server = bypass.server(
    bypass.handler.get(apiPath(ME), () =>
      bypass.json({
        foo: "bar",
      })),
  )

  server.listen()

  const error = await assert.rejects(() => discord.getAuthenticatedUser(ACCESS_TOKEN))
  assert.zodError(error)
  assert.zodIssue(error, "id", ["Required"])
  assert.zodIssue(error, "username", ["Required"])
  assert.zodNoIssue(error, "global_name")
  assert.zodNoIssue(error, "email")
  assert.zodNoIssue(error, "avatar")

  server.close()
})

//-----------------------------------------------------------------------------

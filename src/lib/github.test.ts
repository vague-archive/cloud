import { assert, bypass, Test } from "@test"
import { github } from "@lib"

const ACCESS_TOKEN = "mock-access-token"

//-----------------------------------------------------------------------------

Test("getUser", async () => {
  const server = bypass.server(
    bypass.handler.get("https://api.github.com/user", () =>
      bypass.json({
        login: "jakesgordon",
        id: 123,
        avatar_url: "https://avatars.githubusercontent.com/u/123",
        name: "Jake Gordon",
        email: "jakesgordon@gmail.com",
      })),
  )

  server.listen()

  const user = await github.getAuthenticatedUser(ACCESS_TOKEN)
  assert.present(user)
  assert.equals(user.identifier, 123)
  assert.equals(user.username, "jakesgordon")
  assert.equals(user.avatarUrl, "https://avatars.githubusercontent.com/u/123")
  assert.equals(user.name, "Jake Gordon")
  assert.equals(user.email, "jakesgordon@gmail.com")

  server.close()
})

//-----------------------------------------------------------------------------

Test("getUser missing name and email", async () => {
  const server = bypass.server(
    bypass.handler.get("https://api.github.com/user", () =>
      bypass.json({
        login: "jakesgordon",
        id: 123,
        avatar_url: "https://avatars.githubusercontent.com/u/123",
        name: null,
        email: null,
      })),
  )

  server.listen()

  const user = await github.getAuthenticatedUser(ACCESS_TOKEN)
  assert.present(user)
  assert.equals(user.identifier, 123)
  assert.equals(user.username, "jakesgordon")
  assert.equals(user.avatarUrl, "https://avatars.githubusercontent.com/u/123")
  assert.equals(user.name, "jakesgordon")
  assert.equals(user.email, undefined)

  server.close()
})

//-----------------------------------------------------------------------------

Test("getUser unexpected JSON", async () => {
  const server = bypass.server(
    bypass.handler.get("https://api.github.com/user", () =>
      bypass.json({
        foo: "bar",
      })),
  )

  server.listen()

  const error = await assert.rejects(() => github.getAuthenticatedUser(ACCESS_TOKEN))
  assert.zodError(error)
  assert.zodIssue(error, "id", ["Required"])
  assert.zodIssue(error, "login", ["Required"])
  assert.zodNoIssue(error, "name")
  assert.zodNoIssue(error, "email")
  assert.zodNoIssue(error, "avatar_url")

  server.close()
})

//-----------------------------------------------------------------------------

Test("getLatestRelease", async () => {
  const server = bypass.server(
    bypass.handler.get("https://api.github.com/repos/vaguevoid/editor/releases/latest", () =>
      bypass.json(
        {
          id: 42,
          name: "latest-release",
          tag_name: "v42.0",
          draft: false,
          prerelease: false,
          published_at: "2024-01-01T01:01:01Z",
          body: "this is my latest release",
          assets: [
            {
              id: 1,
              name: "latest.json",
              content_type: "application/json",
              size: 100,
              url: "https://example.com/latest.json",
            },
            {
              id: 2,
              name: "void-darwin-x64.zip",
              content_type: "application/dmg",
              size: 200,
              url: "https://example.com/void-darwin-x64.zip",
            },
            {
              id: 3,
              name: "void-darwin-arm64.zip",
              content_type: "application/dmg",
              size: 300,
              url: "https://example.com/void-darwin-arm64.zip",
            },
            {
              id: 4,
              name: "void-x64_en-US.msi",
              content_type: "application/msi",
              size: 400,
              url: "https://example.com/void-x64_en-US.msi",
            },
          ],
        },
      )),
  )
  server.listen()

  const release = await github.getLatestRelease("vaguevoid", "editor", ACCESS_TOKEN)
  assert.present(release)

  assert.equals(release.id, 42)
  assert.equals(release.name, "latest-release")
  assert.equals(release.tagName, "v42.0")
  assert.equals(release.draft, false)
  assert.equals(release.prerelease, false)
  assert.equals(release.publishedAt, DT`2024-01-01T01:01:01Z`)
  assert.equals(release.body, "this is my latest release")
  assert.equals(release.assets.length, 4)
  assert.equals(release.assets[0].id, 1)
  assert.equals(release.assets[0].name, "latest.json")
  assert.equals(release.assets[0].contentType, "application/json")
  assert.equals(release.assets[0].contentLength, 100)
  assert.equals(release.assets[0].platform, github.ReleasePlatform.Unknown)
  assert.equals(release.assets[0].url, "https://example.com/latest.json")
  assert.equals(release.assets[1].id, 2)
  assert.equals(release.assets[1].name, "void-darwin-x64.zip")
  assert.equals(release.assets[1].contentType, "application/dmg")
  assert.equals(release.assets[1].contentLength, 200)
  assert.equals(release.assets[1].platform, github.ReleasePlatform.AppleIntel)
  assert.equals(release.assets[1].url, "https://example.com/void-darwin-x64.zip")
  assert.equals(release.assets[2].id, 3)
  assert.equals(release.assets[2].name, "void-darwin-arm64.zip")
  assert.equals(release.assets[2].contentType, "application/dmg")
  assert.equals(release.assets[2].contentLength, 300)
  assert.equals(release.assets[2].platform, github.ReleasePlatform.AppleArm)
  assert.equals(release.assets[2].url, "https://example.com/void-darwin-arm64.zip")
  assert.equals(release.assets[3].id, 4)
  assert.equals(release.assets[3].name, "void-x64_en-US.msi")
  assert.equals(release.assets[3].contentType, "application/msi")
  assert.equals(release.assets[3].contentLength, 400)
  assert.equals(release.assets[3].platform, github.ReleasePlatform.Windows)
  assert.equals(release.assets[3].url, "https://example.com/void-x64_en-US.msi")

  server.close()
})

//-----------------------------------------------------------------------------

Test("getReleases", async () => {
  const server = bypass.server(
    bypass.handler.get("https://api.github.com/repos/vaguevoid/editor/releases", () =>
      bypass.json([
        {
          id: 1,
          name: "oldest",
          tag_name: "v1.0",
          draft: false,
          prerelease: false,
          published_at: "2024-01-01T01:01:01Z",
          body: "oldest release",
          assets: [
            {
              id: 11,
              name: "oldest-asset",
              content_type: "application/zip",
              size: 12345,
              url: "https://example.com/oldest-asset.zip",
            },
          ],
        },
        {
          id: 2,
          name: "latest",
          tag_name: "v2.0",
          draft: false,
          prerelease: false,
          published_at: "2024-02-02T02:02:02Z",
          body: "latest release",
          assets: [
            {
              id: 22,
              name: "latest-asset",
              content_type: "application/zip",
              size: 999999,
              url: "https://example.com/latest-asset.zip",
            },
          ],
        },
      ])),
  )
  server.listen()

  const releases = await github.getReleases("vaguevoid", "editor", ACCESS_TOKEN)
  assert.present(releases)
  assert.equals(releases.length, 2)

  const r1 = releases[0]
  const r2 = releases[1]

  assert.equals(r1.id, 2)
  assert.equals(r1.name, "latest")
  assert.equals(r1.tagName, "v2.0")
  assert.equals(r1.draft, false)
  assert.equals(r1.prerelease, false)
  assert.equals(r1.publishedAt, DT`2024-02-02T02:02:02Z`)
  assert.equals(r1.body, "latest release")
  assert.equals(r1.assets.length, 1)
  assert.equals(r1.assets[0].id, 22)
  assert.equals(r1.assets[0].name, "latest-asset")
  assert.equals(r1.assets[0].contentType, "application/zip")
  assert.equals(r1.assets[0].contentLength, 999999)
  assert.equals(r1.assets[0].platform, github.ReleasePlatform.Unknown)
  assert.equals(r1.assets[0].url, "https://example.com/latest-asset.zip")

  assert.equals(r2.id, 1)
  assert.equals(r2.name, "oldest")
  assert.equals(r2.tagName, "v1.0")
  assert.equals(r2.draft, false)
  assert.equals(r2.prerelease, false)
  assert.equals(r2.publishedAt, DT`2024-01-01T01:01:01Z`)
  assert.equals(r2.body, "oldest release")
  assert.equals(r2.assets.length, 1)
  assert.equals(r2.assets[0].id, 11)
  assert.equals(r2.assets[0].name, "oldest-asset")
  assert.equals(r2.assets[0].contentType, "application/zip")
  assert.equals(r2.assets[0].contentLength, 12345)
  assert.equals(r2.assets[0].platform, github.ReleasePlatform.Unknown)
  assert.equals(r2.assets[0].url, "https://example.com/oldest-asset.zip")

  server.close()
})

//-----------------------------------------------------------------------------

Test("idenfity release platform", () => {

  // editor names
  assert.equals(github.identifyReleasePlatform("editor-darwin-arm64-v2.zip"), github.ReleasePlatform.AppleArm)
  assert.equals(github.identifyReleasePlatform("darwin-x64.zip"), github.ReleasePlatform.AppleIntel)
  assert.equals(github.identifyReleasePlatform("editor-x64_en-US.msi"), github.ReleasePlatform.Windows)
  assert.equals(github.identifyReleasePlatform("editor-windows-v2.Setup.exe"), github.ReleasePlatform.Windows)
  assert.equals(github.identifyReleasePlatform("editor-win32-x64.zip"), github.ReleasePlatform.Windows)

  // jam names
  assert.equals(github.identifyReleasePlatform("jam_darwin_arm64.zip"), github.ReleasePlatform.AppleArm)
  assert.equals(github.identifyReleasePlatform("jam_darwin_intelx86.zip"), github.ReleasePlatform.AppleIntel)
  assert.equals(github.identifyReleasePlatform("jam_linux_arm64.zip"), github.ReleasePlatform.LinuxArm)
  assert.equals(github.identifyReleasePlatform("jam_linux_intelx86.zip"), github.ReleasePlatform.LinuxIntel)
  assert.equals(github.identifyReleasePlatform("jam_ui_darwin_arm64.zip"), github.ReleasePlatform.AppleArm)
  assert.equals(github.identifyReleasePlatform("jam_ui_windows_intelx86.zip"), github.ReleasePlatform.Windows)
  assert.equals(github.identifyReleasePlatform("jam_vscode_extension.zip"), github.ReleasePlatform.Unknown)
  assert.equals(github.identifyReleasePlatform("jam_windows_intelx86.zip"), github.ReleasePlatform.Windows)

  // unknown
  assert.equals(github.identifyReleasePlatform("yolo"), github.ReleasePlatform.Unknown)
  assert.equals(github.identifyReleasePlatform(""), github.ReleasePlatform.Unknown)
})

//-----------------------------------------------------------------------------

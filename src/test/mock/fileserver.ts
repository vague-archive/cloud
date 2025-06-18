import { join } from "@std/path"
import { assert, bypass } from "@test"
import { ContentType, Header, Status } from "@lib/http"

//-------------------------------------------------------------------------------------------------

export class MockFileServer {
  static Url = "http://files.example.com/"

  readonly files: Record<string, string>
  readonly deleted: DeleteAction[]
  readonly server: ReturnType<typeof bypass.server>
  readonly root = ".filestore"

  get url() {
    return MockFileServer.Url
  }

  constructor(files?: Record<string, string>) {
    this.files = files || {}
    this.deleted = []
    this.server = bypass.server(
      bypass.handler.get(`${this.url}stats`, () => {
        const values = Object.values(this.files)
        const stats = {
          local: {
            root: this.root,
            count: values.length,
            bytes: values.reduce((bytes, value) => bytes + value.length, 0),
          }
        }
        return new Response(JSON.stringify(stats), {
          status: Status.OK,
          headers: { [Header.ContentType]: ContentType.Json },
        })
      }),
      bypass.handler.get(new RegExp(this.url), ({ request }) => {
        const command = request.headers.get(Header.CustomCommand) ?? "get"
        if (command === "ls") {
          const path = join(request.url.replace(this.url, ""), "/")
          const files = Object.keys(this.files).filter((p) => p.startsWith(path)).map((p) => p.replace(path, "")).sort()
          if (files.length === 0) {
            return new Response("not found", { status: Status.NotFound })
          } else {
            return new Response(JSON.stringify(files), { status: Status.OK })
          }
        } else {
          const path = request.url.replace(this.url, "")
          const content = this.files[path]
          if (content) {
            return new Response(content, { status: Status.OK })
          } else {
            return new Response("not found", { status: Status.NotFound })
          }
        }
      }),
      bypass.handler.post(new RegExp(this.url), async ({ request }) => {
        const path = request.url.replace(this.url, "")
        const content = await request.text()
        this.files[path] = content
        return new Response("saved", { status: Status.OK })
      }),
      bypass.handler.delete(new RegExp(this.url), ({ request }) => {
        const command = request.headers.get(Header.CustomCommand) ?? "delete"
        const path = request.url.replace(this.url, "")
        const files = Object.keys(this.files).filter((p) => p.startsWith(path))
        files.forEach((f) => delete this.files[f])
        this.deleted.push({ path, command })
        return new Response("deleted", { status: Status.OK })
      }),
    )
    this.server.listen()
  }

  assertFileSaved(path: string, expectedContent: string) {
    assert.present(this.files[path], `file ${path} was not saved`)
    assert.equals(this.files[path], expectedContent)
  }

  assertDeleted(path: string) {
    const action = this.deleted.pop()
    assert.present(action)
    assert.equals(action.path, path)
    assert.equals(action.command, "delete")
  }

  assertRemoveDirectory(path: string) {
    const action = this.deleted.pop()
    assert.present(action)
    assert.equals(action.path, path)
    assert.equals(action.command, "rmdir")
  }

  close() {
    this.server.close()
  }
}

//-------------------------------------------------------------------------------------------------

interface DeleteAction {
  path: string
  command: string | null
}

//-------------------------------------------------------------------------------------------------

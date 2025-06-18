import { assert, MockFileServer, Test } from "@test"
import { Status } from "@lib/http"
import { FileStore } from "@lib/filestore"

//-------------------------------------------------------------------------------------------------

Test("FileStore", async () => {
  const fileServer = new MockFileServer()
  const encoder = new TextEncoder()

  const content1 = "first file"
  const content2 = "second file"
  const content3 = "third file"

  const root = "foo"
  const folder1 = "foo/bar"
  const folder2 = "foo/baz"

  const path1 = `${folder1}/first.txt`
  const path2 = `${folder1}/second.txt`
  const path3 = `${folder2}/third.txt`

  const store: FileStore = new FileStore(new URL(fileServer.url))

  assert.equals(await store.stats(), {
    local: {
      root: ".filestore",
      count: 0,
      bytes: 0,
    },
  })

  let response = await store.load(path1)
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), "not found")

  response = await store.save(path1, encoder.encode(content1))
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "saved")

  response = await store.save(path2, encoder.encode(content2))
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "saved")

  response = await store.save(path3, encoder.encode(content3))
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "saved")

  fileServer.assertFileSaved(path1, content1)
  fileServer.assertFileSaved(path2, content2)
  fileServer.assertFileSaved(path3, content3)

  assert.equals(await store.stats(), {
    local: {
      root: ".filestore",
      count: 3,
      bytes: content1.length + content2.length + content3.length,
    }
  })

  response = await store.load(path1)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), content1)

  response = await store.load(path2)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), content2)

  response = await store.load(path3)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), content3)

  response = await store.ls(root)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.json(), [
    "bar/first.txt",
    "bar/second.txt",
    "baz/third.txt",
  ])

  response = await store.ls(folder1)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.json(), [
    "first.txt",
    "second.txt",
  ])

  response = await store.ls(folder2)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.json(), [
    "third.txt",
  ])

  response = await store.ls("/unknown/folder")
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), "not found")

  response = await store.delete(path2)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "deleted")

  fileServer.assertDeleted(path2)

  response = await store.ls(root)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.json(), [
    "bar/first.txt",
    "baz/third.txt",
  ])

  response = await store.rmdir(folder2)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "deleted")

  fileServer.assertRemoveDirectory(folder2)

  response = await store.ls(root)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.json(), [
    "bar/first.txt",
  ])

  response = await store.load(path1)
  assert.equals(response.status, Status.OK)
  assert.equals(await response.text(), "first file")

  response = await store.load(path2)
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), "not found")

  response = await store.load(path3)
  assert.equals(response.status, Status.NotFound)
  assert.equals(await response.text(), "not found")

  assert.equals(await store.stats(), {
    local: {
      root: ".filestore",
      count: 1,
      bytes: content1.length,
    }
  })

  fileServer.close()
})

//-------------------------------------------------------------------------------------------------

import { delay } from "@std/async"
import { assert, Test, testRedis } from "@test"
import { SerializableObject, SerializableValue } from "@lib/serialize"
import { Expiration, expiration, KvStore, MemoryKvStore, RedisKvStore } from "@lib/kvstore"

//-------------------------------------------------------------------------------------------------

Test("common expirations in ms", () => {
  assert.equals(expiration(1000), 1000)
  assert.equals(expiration(Expiration.OneHour), 1000 * 60 * 60)
  assert.equals(expiration(Expiration.OneDay), 1000 * 60 * 60 * 24)
  assert.equals(expiration(Expiration.OneWeek), 1000 * 60 * 60 * 24 * 7)
  assert.equals(expiration(Expiration.OneMonth), 1000 * 60 * 60 * 24 * 30)
})

//-------------------------------------------------------------------------------------------------

Test("RedisKvStore", async () => {
  await testRedis(async (redis) => {
    const store = new RedisKvStore(redis)
    await verifyStore(store)
    await verifyStoreTTL(store)
    store.close()
  })
})

//-------------------------------------------------------------------------------------------------

Test("MemoryKvStore", async () => {
  const store = new MemoryKvStore()
  await verifyStore(store)
})

//-------------------------------------------------------------------------------------------------

async function verifyStore(kv: KvStore) {
  await verifyStoreTypes(kv)
  await verifyStoreWithCompositeKey(kv)
  await verifyStoreDelete(kv)
  await verifyStorePubSub(kv)
}

//-------------------------------------------------------------------------------------------------

interface IUser extends SerializableObject {
  name: string
  age: number
  dob: Date
}

class User {
  name: string
  constructor(name: string) {
    this.name = name
  }
  serialize() {
    return {
      name: this.name,
    }
  }
  static deserialize({ name }: { name: string }): User {
    return new User(name)
  }
}

async function verifyStoreTypes(kv: KvStore) {
  const date = new Date()
  const datetime = DateTime.now()
  const bytes = new Uint8Array([1, 2, 3, 4, 5])
  const obj = { color: "red", size: 10 }
  const arr = [1, "two", 3.0]

  const iface: IUser = {
    name: "bob",
    age: 42,
    dob: new Date(),
  }

  const instance = new User("jake")
  const deserializables = [User]

  assert.undefined(await kv.get(["string"]))
  assert.undefined(await kv.get(["int"]))
  assert.undefined(await kv.get(["float"]))
  assert.undefined(await kv.get(["bigint"]))
  assert.undefined(await kv.get(["true"]))
  assert.undefined(await kv.get(["false"]))
  assert.undefined(await kv.get(["null"]))
  assert.undefined(await kv.get(["undefined"]))
  assert.undefined(await kv.get(["date"]))
  assert.undefined(await kv.get(["datetime"]))
  assert.undefined(await kv.get(["bytes"]))
  assert.undefined(await kv.get(["object"]))
  assert.undefined(await kv.get(["array"]))
  assert.undefined(await kv.get(["interface"]))
  assert.undefined(await kv.get(["instance"]))

  await kv.set(["string"], "hello")
  await kv.set(["int"], 42)
  await kv.set(["float"], 3.14)
  await kv.set(["bigint"], 12345n)
  await kv.set(["true"], true)
  await kv.set(["false"], false)
  await kv.set(["null"], null)
  await kv.set(["undefined"], undefined)
  await kv.set(["date"], date)
  await kv.set(["datetime"], datetime)
  await kv.set(["bytes"], bytes)
  await kv.set(["object"], obj)
  await kv.set(["array"], arr)
  await kv.set(["interface"], iface)
  await kv.set(["instance"], instance)

  assert.equals(await kv.get(["string"]), "hello")
  assert.equals(await kv.get(["int"]), 42)
  assert.equals(await kv.get(["float"]), 3.14)
  assert.equals(await kv.get(["bigint"]), 12345n)
  assert.equals(await kv.get(["true"]), true)
  assert.equals(await kv.get(["false"]), false)
  assert.equals(await kv.get(["null"]), null)
  assert.equals(await kv.get(["undefined"]), undefined)
  assert.equals(await kv.get(["date"]), date)
  assert.equals(await kv.get(["datetime"]), datetime)
  assert.equals(await kv.get(["bytes"]), bytes)
  assert.equals(await kv.get(["object"]), obj)
  assert.equals(await kv.get(["array"]), arr)
  assert.equals(await kv.get(["interface"]), iface)
  assert.equals(await kv.get(["instance"], { deserializables }), instance)
}

//-------------------------------------------------------------------------------------------------

async function verifyStoreWithCompositeKey(kv: KvStore) {
  assert.undefined(await kv.get([1, "a"]))
  assert.undefined(await kv.get([1, "b"]))
  assert.undefined(await kv.get([1, "x"]))

  await kv.set([1, "a"], "1a")
  await kv.set([1, "b"], "1b")

  assert.equals(await kv.get([1, "a"]), "1a")
  assert.equals(await kv.get([1, "b"]), "1b")
  assert.equals(await kv.get([1, "x"]), undefined)
}

//-------------------------------------------------------------------------------------------------

async function verifyStoreDelete(kv: KvStore) {
  await kv.set([1, "a"], "1a")
  await kv.set([1, "b"], "1b")
  await kv.set([2, "a"], "2a")
  await kv.set([2, "b"], "2b")

  assert.equals(await kv.get([1, "a"]), "1a")
  assert.equals(await kv.get([1, "b"]), "1b")
  assert.equals(await kv.get([2, "a"]), "2a")
  assert.equals(await kv.get([2, "b"]), "2b")

  await kv.delete([1, "b"])

  assert.equals(await kv.get([1, "a"]), "1a")
  assert.equals(await kv.get([1, "b"]), undefined)
  assert.equals(await kv.get([2, "a"]), "2a")
  assert.equals(await kv.get([2, "b"]), "2b")

  await kv.delete([2, "a"])

  assert.equals(await kv.get([1, "a"]), "1a")
  assert.equals(await kv.get([1, "b"]), undefined)
  assert.equals(await kv.get([2, "a"]), undefined)
  assert.equals(await kv.get([2, "b"]), "2b")
}

//-------------------------------------------------------------------------------------------------

async function verifyStoreTTL(kv: KvStore) {
  assert.undefined(await kv.get(["evergreen"]))
  assert.undefined(await kv.get(["ephemeral"]))

  await kv.set(["evergreen"], "forever")
  await kv.set(["ephemeral"], "like dust in the wind", { expires: 50 })

  assert.equals(await kv.get(["evergreen"]), "forever")
  assert.equals(await kv.get(["ephemeral"]), "like dust in the wind")
  assert.equals(await kv.ttl(["evergreen"]), undefined)
  assert.equals(await kv.ttl(["ephemeral"]), 1000) // redis rounds (up) to second

  await delay(10)

  assert.equals(await kv.get(["evergreen"]), "forever")
  assert.equals(await kv.get(["ephemeral"]), "like dust in the wind")
  assert.equals(await kv.ttl(["evergreen"]), undefined)
  assert.equals(await kv.ttl(["ephemeral"]), 1000)

  await delay(1000) // min redis TTL is 1 second

  assert.equals(await kv.get(["evergreen"]), "forever")
  assert.undefined(await kv.get(["ephemeral"]))
  assert.equals(await kv.ttl(["evergreen"]), undefined)
  assert.equals(await kv.ttl(["ephemeral"]), undefined)
}

//-------------------------------------------------------------------------------------------------

async function verifyStorePubSub(kv: KvStore) {
  const first:  [string, SerializableValue][] = []
  const second: [string, SerializableValue][] = []
  const wild:   [string, SerializableValue][] = []

  let done = false

  await kv.subscribe("channel:one", (channel, message) => { first.push([channel, message])  })
  await kv.subscribe("channel:two", (channel, message) => { second.push([channel, message]) })
  await kv.subscribe("channel",     (channel, message) => { wild.push([channel, message])   })
  await kv.subscribe("done",        ()                 => { done = true                     })

  await kv.publish("channel:one", "hello channel:one")
  await kv.publish("channel:two", "hello channel:two")
  await kv.publish("channel",     "hello channel")
  await kv.publish("channel:two", { message: "yolo", count: 32 })

  // wait for pubsub to be completed
  await kv.publish("done", true)
  while (!done) {
    await delay(10)
  }

  assert.equals(first, [
    ["channel:one", "hello channel:one"],
  ])

  assert.equals(second, [
    ["channel:two", "hello channel:two"],
    ["channel:two", { message: "yolo", count: 32 }],
  ])

  assert.equals(wild, [
    ["channel:one", "hello channel:one"],
    ["channel:two", "hello channel:two"],
    ["channel",     "hello channel"],
    ["channel:two", { message: "yolo", count: 32 }],
  ])
}

//-------------------------------------------------------------------------------------------------

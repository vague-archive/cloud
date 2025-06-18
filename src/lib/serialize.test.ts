import { assert, Test } from "@test"
import { deserialize, SerializableObject, serialize, SerializedObject } from "@lib/serialize"

//-------------------------------------------------------------------------------------------------

Test("serialize simple types", () => {
  assert.equals(serialize(42), 42)
  assert.equals(serialize(3.14), 3.14)
  assert.equals(serialize("hello"), "hello")
  assert.equals(serialize(true), true)
  assert.equals(serialize(false), false)
  assert.equals(serialize(null), null)
  assert.equals(serialize(undefined), undefined)
})

Test("deserialize simple types", () => {
  assert.equals(deserialize(42), 42)
  assert.equals(deserialize(3.14), 3.14)
  assert.equals(deserialize("hello"), "hello")
  assert.equals(deserialize(true), true)
  assert.equals(deserialize(false), false)
  assert.equals(deserialize(null), null)
  assert.equals(deserialize(undefined), undefined)
})

//-------------------------------------------------------------------------------------------------

Test("serialize and deserialize a BigInt", () => {
  const value = 123456n
  assert.equals(serialize(value), {
    constructorName: "BigInt",
    value: value.toString(),
  })
  assert.equals(deserialize(serialize(value)), value)
})

//-------------------------------------------------------------------------------------------------

Test("serialize and deserialize a Date", () => {
  const date = new Date()
  assert.equals(serialize(date), {
    constructorName: "Date",
    value: date.toISOString(),
  })
  assert.equals(deserialize(serialize(date)), date)
})

//-------------------------------------------------------------------------------------------------

Test("serialize and deserialize a DateTime", () => {
  const dt = DT`2024-01-02T03:04:05.123Z`
  assert.equals(serialize(dt), {
    constructorName: "DateTime",
    value: dt.toISO(),
  })
  assert.equals(deserialize(serialize(dt)), dt)
})

//-------------------------------------------------------------------------------------------------

Test("serialize and deserialize a Uint8Array (no-op)", () => {
  const buffer = new Uint8Array([1, 2, 3, 4, 5])
  assert.equals(buffer.byteLength, 5)
  assert.equals(serialize(buffer), buffer)
  assert.equals(deserialize(serialize(buffer)), buffer)
})

//-------------------------------------------------------------------------------------------------

Test("serialize array", () => {
  assert.equals(serialize([42]), [42])
  assert.equals(serialize([3.14]), [3.14])
  assert.equals(serialize(["hello"]), ["hello"])
  assert.equals(serialize([true]), [true])
  assert.equals(serialize([false]), [false])
  assert.equals(serialize([{ key: "value" }]), [{ key: "value" }])
  assert.equals(serialize([42, 3.14, "hello", true, false]), [42, 3.14, "hello", true, false])
})

Test("deserialize array", () => {
  assert.equals(deserialize([42]), [42])
  assert.equals(deserialize([3.14]), [3.14])
  assert.equals(deserialize(["hello"]), ["hello"])
  assert.equals(deserialize([true]), [true])
  assert.equals(deserialize([false]), [false])
  assert.equals(deserialize([{ key: "value" }]), [{ key: "value" }])
  assert.equals(deserialize([42, 3.14, "hello", true, false]), [42, 3.14, "hello", true, false])
})

//-------------------------------------------------------------------------------------------------

Test("serializable object", () => {
  const obj = {
    name: "bob",
    age: 42,
    pi: 3.14,
    happy: true,
    sad: false,
    array: [1, 2, "three"],
    object: { key: "value" },
    date: new Date(),
    datetime: DT`2024-01-01`,
    null: null,
  }
  assert.equals(serialize(obj), {
    name: "bob",
    age: 42,
    pi: 3.14,
    happy: true,
    sad: false,
    array: [1, 2, "three"],
    object: { key: "value" },
    date: { constructorName: "Date", value: obj.date.toISOString() },
    datetime: { constructorName: "DateTime", value: obj.datetime.toISO() },
    null: null,
  })
  assert.equals(deserialize(serialize(obj)), obj)
})

//-------------------------------------------------------------------------------------------------

Test("serializable interface", () => {
  interface Person extends SerializableObject {
    name: string
    age: number
    dob: Date
  }

  const person: Person = {
    name: "Jake",
    age: 42,
    dob: new Date(),
  }
  assert.equals(serialize(person), {
    name: "Jake",
    age: 42,
    dob: { constructorName: "Date", value: person.dob.toISOString() },
  })
  assert.equals(deserialize(serialize(person)), person)
})

//-------------------------------------------------------------------------------------------------

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

Test("serializable class instance", () => {
  const user = new User("bob")
  assert.equals(serialize(user), {
    constructorName: "User",
    value: {
      name: "bob",
    },
  })
  assert.equals(deserialize(serialize(user), [User]), user)
})

//-------------------------------------------------------------------------------------------------

class Team {
  name: string
  users: User[]
  constructor(name: string, users: User[]) {
    this.name = name
    this.users = users
  }

  serialize() {
    return {
      name: this.name,
      users: serialize(this.users),
    }
  }

  static deserialize(data: SerializedObject) {
    const name = data.name as string
    const users = deserialize(data.users, [User]) as User[]
    return new Team(name, users)
  }
}

Test("nested serializable classes", () => {
  const sully = new User("sully")
  const mike = new User("mike")
  const team = new Team("Monsters, Inc", [sully, mike])

  assert.equals(serialize(team), {
    constructorName: "Team",
    value: {
      name: "Monsters, Inc",
      users: [
        {
          constructorName: "User",
          value: {
            name: "sully",
          },
        },
        {
          constructorName: "User",
          value: {
            name: "mike",
          },
        },
      ],
    },
  })

  assert.equals(deserialize(serialize(team), [Team]), team)
})

//-------------------------------------------------------------------------------------------------

class Pos {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  serialize() {
    return `${this.x},${this.y}`
  }

  static deserialize(value: string): Pos {
    const [x, y] = value.split(",")
    return new Pos(parseInt(x), parseInt(y))
  }
}

Test("serializable value class instance", () => {
  const pos = new Pos(10, 20)
  assert.equals(serialize(pos), {
    constructorName: "Pos",
    value: "10,20", // Pos is Serializable, but serializes to a simple value, not a complex object
  })
  assert.equals(deserialize(serialize(pos), [Pos]), pos)
})

//-------------------------------------------------------------------------------------------------

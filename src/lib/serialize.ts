import { assert, is } from "@lib"

//-------------------------------------------------------------------------------------------------

export interface Serializable {
  serialize(): SerializedValue
}

export interface Deserializable {
  name: string
  deserialize(serialized: SerializedValue): SerializableValue
}

export type Deserializer = (value: SerializedValue) => SerializableValue

//-------------------------------------------------------------------------------------------------

export type SerializableValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | Date
  | DateTime
  | Uint8Array
  | Serializable
  | SerializableObject
  | SerializableValue[]

export type SerializableObject = {
  [key: string]: SerializableValue
}

//-------------------------------------------------------------------------------------------------

export type SerializedValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Uint8Array
  | SerializedObject
  | SerializedValue[]

export type SerializedObject = {
  [key: string]: SerializedValue
}

//-------------------------------------------------------------------------------------------------

export function serialize(value: SerializableValue): SerializedValue {
  if (isSerializable(value)) {
    return {
      constructorName: value.constructor.name,
      value: value.serialize(),
    }
  } else if (is.date(value)) {
    return {
      constructorName: "Date",
      value: value.toISOString(),
    }
  } else if (is.datetime(value)) {
    return {
      constructorName: "DateTime",
      value: value.toISO(),
    }
  } else if (is.bigint(value)) {
    return {
      constructorName: "BigInt",
      value: value.toString(),
    }
  } else if (is.bytes(value)) {
    return value
  } else if (is.array(value)) {
    return value.map((v) => serialize(v))
  } else if (is.object(value)) {
    const entries = Object.entries(value)
    return Object.fromEntries(entries.map(([key, v]) => [key, serialize(v)]))
  } else {
    return value
  }
}

export function deserialize(data: SerializedValue, deserializables: Deserializable[] = []): SerializableValue {
  if (is.object(data) && "constructorName" in data) {
    const { constructorName, value } = data
    assert.isString(constructorName)
    const deserializable = deserializables.find((d) => d.name === constructorName)
    if (deserializable) {
      return deserializable.deserialize(value)
    }
    const deserialize = KnownDeserializers[constructorName]
    if (deserialize) {
      return deserialize(value)
    }
    throw new Error(`No deserializer for ${constructorName}`)
  } else if (is.bytes(data)) {
    return data
  } else if (is.array(data)) {
    return data.map((v) => deserialize(v, deserializables))
  } else if (is.object(data)) {
    const entries = Object.entries(data)
    return Object.fromEntries(entries.map(([key, v]) => [key, deserialize(v, deserializables)]))
  } else {
    return data
  }
}

//-------------------------------------------------------------------------------------------------

const KnownDeserializers: Record<string, Deserializer> = {
  "Date": (value) => {
    assert.isString(value)
    return new Date(value)
  },
  "DateTime": (value) => {
    assert.isString(value)
    return DateTime.fromISO(value)
  },
  "BigInt": (value) => {
    assert.isString(value)
    return BigInt(value)
  },
}

//-------------------------------------------------------------------------------------------------

function isSerializable(value: SerializableValue): value is Serializable {
  return is.object(value) && "serialize" in value
}

//-------------------------------------------------------------------------------------------------

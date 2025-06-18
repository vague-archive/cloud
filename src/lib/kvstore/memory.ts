import { KvGetOptions, KvKey, KvSetOptions, KvStore, KvSubscriber, KvValue } from "@lib/kvstore"
import { deserialize, SerializableValue, serialize } from "@lib/serialize"

//-------------------------------------------------------------------------------------------------

export class MemoryKvStore implements KvStore {
  #store: Map<string, string | Uint8Array>
  #subscribers: [string, KvSubscriber][]

  constructor() {
    this.#store = new Map()
    this.#subscribers = []
  }

  get(key: KvKey, options?: KvGetOptions): KvValue {
    const serialized = this.#store.get(skey(key))
    if (serialized) {
      if (serialized instanceof Uint8Array) {
        return serialized
      } else {
        return deserialize(JSON.parse(serialized), options?.deserializables)
      }
    }
  }

  set(key: KvKey, value: KvValue, _options?: KvSetOptions): boolean {
    if (value instanceof Uint8Array) {
      this.#store.set(skey(key), value)
    } else {
      const serialized = JSON.stringify(serialize(value))
      this.#store.set(skey(key), serialized)
    }
    return true
  }

  delete(key: KvKey) {
    this.#store.delete(skey(key))
  }

  ttl(_key: KvKey) {
    throw new Error("unsupported")
  }

  async publish(channel: string, message: SerializableValue) {
    for (const [c, subscriber] of this.#subscribers) {
      if (channel.startsWith(c)) {
        await subscriber(channel, message)
      }
    }
  }

  subscribe(channel: string, handler: KvSubscriber) {
    this.#subscribers.push([channel, handler])
  }

  close() {
    // nothing to cleanup
  }
}

//-------------------------------------------------------------------------------------------------

function skey(key: KvKey) {
  return JSON.stringify(key)
}

//-------------------------------------------------------------------------------------------------

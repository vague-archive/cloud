import { Buffer } from "node:buffer"
import { Redis } from "@deps"
import { is } from "@lib"
import { deserialize, SerializableValue, serialize } from "@lib/serialize"
import { expiration, KvGetOptions, KvKey, KvSetOptions, KvStore, KvSubscriber, KvValue } from "@lib/kvstore"

//-------------------------------------------------------------------------------------------------

export class RedisKvStore implements KvStore {
  #redis: Redis
  #pubsub: Redis
  #subscribers: [string, KvSubscriber][]
  #owner: boolean

  constructor(redis: string | Redis) {
    if (is.string(redis)) {
      this.#redis = new Redis(redis)
      this.#owner = true
    } else {
      this.#redis = redis
      this.#owner = false
    }
    this.#subscribers = []
    this.#pubsub = new Redis(this.#redis.options)
    this.#pubsub.on("pmessage", (pattern, channel, message) => this.onMessage(pattern, channel, message))
  }

  async get(key: KvKey, options?: KvGetOptions): Promise<KvValue> {
    const type = await this.#redis.get(tkey(key))
    if (type === "bytes") {
      const value = await this.#redis.getBuffer(rkey(key))
      if (is.present(value)) {
        return new Uint8Array(value)
      }
    } else {
      const value = await this.#redis.get(rkey(key))
      if (is.present(value)) {
        return deserialize(JSON.parse(value), options?.deserializables)
      }
    }
  }

  async set(key: KvKey, value: KvValue, options?: KvSetOptions): Promise<boolean> {
    if (is.bytes(value)) {
      await this.#redis.set(tkey(key), "bytes")
      await this.#redis.set(rkey(key), Buffer.from(value))
      this.expire(key, options)
      return true
    } else if (value !== undefined) {
      await this.#redis.set(tkey(key), "json")
      await this.#redis.set(rkey(key), JSON.stringify(serialize(value)))
      this.expire(key, options)
      return true
    } else {
      return false
    }
  }

  async ttl(key: KvKey) {
    const value = await this.#redis.ttl(rkey(key))
    return value < 0 ? undefined : value * 1000
  }

  async delete(key: KvKey) {
    await this.#redis.del(tkey(key))
    await this.#redis.del(rkey(key))
  }

  async publish(channel: string, message: SerializableValue) {
    await this.#redis.publish(channel, JSON.stringify(serialize(message)))
  }

  subscribe(channel: string, handler: KvSubscriber): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const pattern = `${channel}*`
      this.#pubsub.psubscribe(pattern, (err) => {
        if (err) {
          reject(err)
        } else {
          this.#subscribers.push([pattern, handler])
          resolve()
        }
      })
    })
  }

  private async onMessage(pattern: string, channel: string, message: string) {
    for (const [p, subscriber] of this.#subscribers) {
      if (p === pattern) {
        if (pattern.startsWith("__keyspace@")) {
          await subscriber(channel, message)
        } else {
          await subscriber(channel, deserialize(JSON.parse(message)))
        }
      }
    }
  }

  close() {
    if (this.#owner) {
      this.#redis.disconnect()
    }
    this.#pubsub.disconnect()
  }

  private expire(key: KvKey, options?: KvSetOptions) {
    if (options?.expires) {
      const ms = expiration(options.expires)
      const seconds = Math.ceil(ms / 1000)
      this.#redis.expire(tkey(key), seconds)
      this.#redis.expire(rkey(key), seconds)
    }
  }
}

//-------------------------------------------------------------------------------------------------

function rkey(key: KvKey): string {
  return key.join(":")
}

function tkey(key: KvKey): string {
  return `${rkey(key)}:type`
}

//-------------------------------------------------------------------------------------------------

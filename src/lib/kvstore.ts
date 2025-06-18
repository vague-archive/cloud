import { assert, is } from "@lib"
import { Deserializable, SerializableValue } from "@lib/serialize"

//-------------------------------------------------------------------------------------------------

export enum Expiration {
  OneHour = "one-hour",
  OneDay = "one-day",
  OneWeek = "one-week",
  OneMonth = "one-month",
}

export function expiration(e: Expiration | number) {
  if (is.number(e)) {
    return e
  } else {
    switch (e) {
      case Expiration.OneHour:
        return 1000 * 60 * 60
      case Expiration.OneDay:
        return 1000 * 60 * 60 * 24
      case Expiration.OneWeek:
        return 1000 * 60 * 60 * 24 * 7
      case Expiration.OneMonth:
        return 1000 * 60 * 60 * 24 * 30
      default:
        assert.unreachable(e)
    }
  }
}

//-------------------------------------------------------------------------------------------------

export type KvKeyPart = string | number | bigint
export type KvKey = KvKeyPart[]
export type KvValue = SerializableValue | undefined

export interface KvGetOptions {
  deserializables?: Deserializable[]
}

export interface KvSetOptions {
  expires?: Expiration | number
}

export type KvSubscriber = (channel: string, message: SerializableValue) => void | Promise<void>

export interface KvStore {
  get(key: KvKey, options?: KvGetOptions): KvValue | Promise<KvValue>
  set(key: KvKey, value: KvValue, options?: KvSetOptions): boolean | Promise<boolean>
  delete(key: KvKey): void | Promise<void>
  ttl(key: KvKey): void | number | undefined | Promise<number | undefined>
  publish(channel: string, message: SerializableValue): void | Promise<void>
  subscribe(channel: string, handler: KvSubscriber): void | Promise<void>
  close(): void | Promise<void>
}

export { RedisKvStore } from "./kvstore/redis.ts"
export { MemoryKvStore } from "./kvstore/memory.ts"

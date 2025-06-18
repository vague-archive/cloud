import { Id, Model } from "@domain"
import { Clock } from "@lib/clock"

//-----------------------------------------------------------------------------

import { TokenType } from "@db/schema"
export { TokenType }

const TTL: Record<TokenType, DurationLike> = {
  [TokenType.Access]: { years: 1 },
  [TokenType.Invite]: { days: 7 },
  [TokenType.Register]: { days: 7 },
  [TokenType.ChangeEmail]: { hours: 1 },
  [TokenType.ResetPassword]: { hours: 1 },
}

//-----------------------------------------------------------------------------

export class Token implements Model {
  static TTL = TTL

  id: Id
  type: TokenType
  value?: string // the (base64 encoded) token, but is never actually stored in DB...
  digest: string // ... instead we store the hash digest in the DB
  tail: string   // ... along with the tailing 6 characters to help the user identify which is which
  organizationId?: Id
  userId?: Id
  sentTo?: string
  isSpent: boolean
  expiresOn?: DateTime
  createdOn: DateTime
  updatedOn: DateTime

  constructor(attr: NewTokenAttributes) {
    this.id = attr.id
    this.type = attr.type
    this.value = attr.value
    this.digest = attr.digest
    this.tail = attr.tail
    this.organizationId = attr.organizationId
    this.userId = attr.userId
    this.sentTo = attr.sentTo
    this.isSpent = attr.isSpent
    this.expiresOn = attr.expiresOn
    this.createdOn = attr.createdOn
    this.updatedOn = attr.updatedOn
  }

  hasExpired(clock: Clock) {
    return (this.expiresOn !== undefined) && (this.expiresOn < clock.now)
  }

  static one(value: NewTokenAttributes) {
    return new Token(value)
  }

  static many(value: NewTokenAttributes[]) {
    return value.map((u) => new Token(u))
  }

  static maybe(value: NewTokenAttributes | undefined) {
    return value ? new Token(value) : undefined
  }
}

//-----------------------------------------------------------------------------

interface NewTokenAttributes {
  id: Id
  type: TokenType
  value?: string
  digest: string
  tail: string
  organizationId?: Id
  userId?: Id
  sentTo?: string
  isSpent: boolean
  expiresOn?: DateTime
  createdOn: DateTime
  updatedOn: DateTime
}

//-----------------------------------------------------------------------------

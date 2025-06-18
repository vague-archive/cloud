import { Id, Model } from "@domain"

//-----------------------------------------------------------------------------

import { IdentityProvider } from "@db/schema"
export { IdentityProvider }

//-----------------------------------------------------------------------------

export class Identity implements Model {
  id: Id
  userId: Id
  provider: IdentityProvider
  identifier: string
  username: string
  createdOn: DateTime
  updatedOn: DateTime

  constructor(attr: NewIdentityAttributes) {
    this.id = attr.id
    this.userId = attr.userId
    this.provider = attr.provider
    this.identifier = attr.identifier
    this.username = attr.username
    this.createdOn = attr.createdOn
    this.updatedOn = attr.updatedOn
  }

  static one(value: NewIdentityAttributes) {
    return new Identity(value)
  }

  static many(value: NewIdentityAttributes[]) {
    return value.map((u) => new Identity(u))
  }

  static maybe(value: NewIdentityAttributes | undefined) {
    return value ? new Identity(value) : undefined
  }
}

//-----------------------------------------------------------------------------

interface NewIdentityAttributes {
  id: Id
  userId: Id
  provider: IdentityProvider
  identifier: string
  username: string
  createdOn: DateTime
  updatedOn: DateTime
}

//-----------------------------------------------------------------------------

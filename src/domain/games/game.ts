import { Id, Deploy, Model, Organization } from "@domain"

//-----------------------------------------------------------------------------

import { GamePurpose } from "@db/schema"
export { GamePurpose }

//-----------------------------------------------------------------------------

export class Game implements Model {
  id: Id
  organizationId: Id
  name: string
  slug: string
  description?: string
  purpose: GamePurpose
  archived: boolean
  archivedOn?: DateTime
  createdOn: DateTime
  updatedOn: DateTime

  // Relations
  organization?: Organization
  deploys?: Deploy[]

  constructor(attr: NewGameAttributes) {
    this.id = attr.id
    this.organizationId = attr.organizationId
    this.organization = attr.organization
    this.name = attr.name
    this.slug = attr.slug
    this.description = attr.description
    this.purpose = attr.purpose
    this.archived = attr.archived
    this.archivedOn = attr.archivedOn
    this.createdOn = attr.createdOn
    this.updatedOn = attr.updatedOn
  }

  //---------------------------------------------------------------------------

  static one(value: NewGameAttributes) {
    return new Game(value)
  }

  static many(value: NewGameAttributes[]) {
    return value.map((u) => new Game(u))
  }

  static maybe(value: NewGameAttributes | undefined) {
    return value ? new Game(value) : undefined
  }
}

//-----------------------------------------------------------------------------

interface NewGameAttributes {
  id: Id
  organizationId: Id
  organization?: Organization
  name: string
  slug: string
  description?: string
  purpose: GamePurpose
  archived: boolean
  archivedOn?: DateTime
  createdOn: DateTime
  updatedOn: DateTime
}

//-----------------------------------------------------------------------------

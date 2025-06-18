import { Game, Id, Member, Model } from "@domain"

//-----------------------------------------------------------------------------

export class Organization implements Model {
  id: Id
  name: string
  slug: string
  createdOn: DateTime
  updatedOn: DateTime

  // Relations
  games?: Game[]
  members?: Member[]

  constructor(attr: NewOrganizationAttributes) {
    this.id = attr.id
    this.name = attr.name
    this.slug = attr.slug
    this.createdOn = attr.createdOn
    this.updatedOn = attr.updatedOn
  }

  static one(value: NewOrganizationAttributes) {
    return new Organization(value)
  }

  static many(value: NewOrganizationAttributes[]) {
    return value.map((u) => new Organization(u))
  }

  static maybe(value: NewOrganizationAttributes | undefined) {
    return value ? new Organization(value) : undefined
  }
}

//-----------------------------------------------------------------------------

interface NewOrganizationAttributes {
  id: Id
  name: string
  slug: string
  createdOn: DateTime
  updatedOn: DateTime
}

//-----------------------------------------------------------------------------

import { Id, ModelWithoutId, Organization, User } from "@domain"

//-----------------------------------------------------------------------------

export class Member implements ModelWithoutId {
  organizationId: Id
  userId: Id
  createdOn: DateTime
  updatedOn: DateTime

  // Relations
  organization?: Organization
  user?: User

  constructor(attr: NewMemberAttributes) {
    this.organizationId = attr.organizationId
    this.userId = attr.userId
    this.createdOn = attr.createdOn
    this.updatedOn = attr.updatedOn
  }

  static one(value: NewMemberAttributes) {
    return new Member(value)
  }

  static many(value: NewMemberAttributes[]) {
    return value.map((u) => new Member(u))
  }

  static maybe(value: NewMemberAttributes | undefined) {
    return value ? new Member(value) : undefined
  }
}

//-----------------------------------------------------------------------------

interface NewMemberAttributes {
  organizationId: Id
  userId: Id
  createdOn: DateTime
  updatedOn: DateTime
}

//-----------------------------------------------------------------------------

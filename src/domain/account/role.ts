import { Id, ModelWithoutId } from "@domain"

//-----------------------------------------------------------------------------

import { UserRoleType } from "@db/schema"
export { UserRoleType }

//-----------------------------------------------------------------------------

export class UserRole implements ModelWithoutId {
  userId: Id
  role: UserRoleType
  createdOn: DateTime
  updatedOn: DateTime

  constructor(attr: NewUserRoleAttributes) {
    this.userId = attr.userId
    this.role = attr.role
    this.createdOn = attr.createdOn
    this.updatedOn = attr.updatedOn
  }

  static one(value: NewUserRoleAttributes) {
    return new UserRole(value)
  }

  static many(value: NewUserRoleAttributes[]) {
    return value.map((u) => new UserRole(u))
  }

  static maybe(value: NewUserRoleAttributes | undefined) {
    return value ? new UserRole(value) : undefined
  }
}

//-----------------------------------------------------------------------------

interface NewUserRoleAttributes {
  userId: Id
  role: UserRoleType
  createdOn: DateTime
  updatedOn: DateTime
}

//-----------------------------------------------------------------------------

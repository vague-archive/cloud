import { assert } from "@lib"
import { Id, Model, Identity, UserRole, UserRoleType, Organization } from "@domain"

//-----------------------------------------------------------------------------

export class User implements Model {
  id: Id
  name: string
  email: string
  disabled: boolean
  timezone: string
  locale: string
  createdOn: DateTime
  updatedOn: DateTime

  // Relations
  roles?: UserRole[]
  identities?: Identity[]
  organizations?: Organization[]

  // temporary
  get identity(): Identity {
    const first = this.identities?.[0];
    assert.present(first);
    return first;
  }

  // temporary
  get sysadmin(): boolean {
    return this.roles?.some((r) => r.role === UserRoleType.Sysadmin) ?? false
  }

  constructor(attr: NewUserAttributes) {
    this.id = attr.id
    this.name = attr.name
    this.email = attr.email
    this.disabled = attr.disabled
    this.timezone = attr.timezone
    this.locale = attr.locale
    this.createdOn = attr.createdOn
    this.updatedOn = attr.updatedOn
    this.identities = attr.identities
    this.organizations = attr.organizations
  }

  belongsTo(org: Organization) {
    assert.present(this.organizations, "organizations are not loaded")
    return this.organizations.find((o) => o.id === org.id) !== undefined
  }

  static one(value: NewUserAttributes) {
    return new User(value)
  }

  static many(value: NewUserAttributes[]) {
    return value.map((u) => new User(u))
  }

  static maybe(value: NewUserAttributes | undefined) {
    return value ? new User(value) : undefined
  }
}

//-----------------------------------------------------------------------------

interface NewUserAttributes {
  id: Id
  name: string
  email: string
  disabled: boolean
  timezone: string
  locale: string
  createdOn: DateTime
  updatedOn: DateTime
  identities?: Identity[]
  organizations?: Organization[]
}

//-----------------------------------------------------------------------------

import { kysely } from "@deps"

//-----------------------------------------------------------------------------

export type Database = kysely.Kysely<Tables>
export type Id = number | bigint

//-----------------------------------------------------------------------------

export interface Tables {
  organizations: OrganizationRecord
  users: UserRecord
  user_roles: UserRoleRecord
  identities: IdentityRecord
  members: MemberRecord
  tokens: TokenRecord
  games: GameRecord
  deploys: DeployRecord
}

//-----------------------------------------------------------------------------

interface Record {
  id: kysely.Generated<Id>
  createdOn: DateTime
  updatedOn: DateTime
}

//-----------------------------------------------------------------------------

interface OrganizationRecord extends Record {
  name: string
  slug: string
}

//-----------------------------------------------------------------------------

interface UserRecord extends Record {
  name: string
  email: string
  disabled: boolean
  timezone: string
  locale: string
  password?: string
}

//-----------------------------------------------------------------------------

export enum UserRoleType {
  Sysadmin = "sysadmin",
}

interface UserRoleRecord extends Record {
  userId: Id
  role: UserRoleType
}

//-----------------------------------------------------------------------------

export enum IdentityProvider {
  Github = "github",
  Google = "google",
  Microsoft = "microsoft",
  Discord = "discord",
}

interface IdentityRecord extends Record {
  userId: Id
  provider: IdentityProvider
  identifier: string
  username: string
}

//-----------------------------------------------------------------------------

interface MemberRecord extends Record {
  organizationId: Id
  userId: Id
}

//-----------------------------------------------------------------------------

export enum TokenType {
  Access = "access",
  Invite = "invite",
  Register = "register",
  ResetPassword = "resetpassword",
  ChangeEmail = "changeemail",
}

interface TokenRecord extends Record {
  type: TokenType
  digest: string
  tail: string
  organizationId?: Id
  userId?: Id
  sentTo?: string
  isSpent: boolean
  expiresOn?: DateTime
}

//-----------------------------------------------------------------------------

export enum GamePurpose {
  Game = "game",
  Tool = "tool",
}

interface GameRecord extends Record {
  organizationId: Id
  name: string
  slug: string
  description?: string
  purpose: GamePurpose
  archived: boolean
  archivedOn?: DateTime
}

//-----------------------------------------------------------------------------

export enum DeployState {
  Deploying = "deploying",
  Ready = "ready",
  Failed = "failed",
}

interface DeployRecord extends Record {
  organizationId: Id
  gameId: Id
  state: DeployState
  active: number
  slug: string
  path: string
  deployedBy: Id
  deployedOn: DateTime
  error?: string
  password?: string
  pinned: boolean
}

//-----------------------------------------------------------------------------

export type SelectOrganization = kysely.Selectable<OrganizationRecord>
export type SelectUser = kysely.Selectable<UserRecord>
export type SelectUserRole = kysely.Selectable<UserRoleRecord>
export type SelectIdentity = kysely.Selectable<IdentityRecord>
export type SelectMember = kysely.Selectable<MemberRecord>
export type SelectToken = kysely.Selectable<TokenRecord>
export type SelectGame = kysely.Selectable<GameRecord>
export type SelectDeploy = kysely.Selectable<DeployRecord>

export type NewOrganization = kysely.Insertable<OrganizationRecord>
export type NewUser = kysely.Insertable<UserRecord>
export type NewUserRole = kysely.Insertable<UserRoleRecord>
export type NewIdentity = kysely.Insertable<IdentityRecord>
export type NewMember = kysely.Insertable<MemberRecord>
export type NewToken = kysely.Insertable<TokenRecord>
export type NewGame = kysely.Insertable<GameRecord>
export type NewDeploy = kysely.Insertable<DeployRecord>

//-----------------------------------------------------------------------------

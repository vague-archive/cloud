import { assert, crypto } from "@lib"
import { Game, Id, Model, User } from "@domain"

//-----------------------------------------------------------------------------

import { DeployState } from "@db/schema"
export { DeployState }

const PASSWORD_SEPARATOR = "::"

//-----------------------------------------------------------------------------

export class Deploy implements Model {
  static ExpirationDays = 60

  id: Id
  organizationId: Id
  gameId: Id
  state: DeployState
  active: number
  slug: string
  path: string
  error?: string
  pinned: boolean
  deployedBy: Id
  deployedOn: DateTime
  createdOn: DateTime
  updatedOn: DateTime

  // Relations
  game?: Game
  deployedByUser?: User

  constructor(attr: NewDeployAttributes) {
    this.id = attr.id
    this.organizationId = attr.organizationId
    this.gameId = attr.gameId
    this.game = attr.game
    this.state = attr.state
    this.active = attr.active
    this.slug = attr.slug
    this.path = attr.path
    this.error = attr.error ?? undefined
    this.pinned = attr.pinned ?? false
    this.deployedBy = attr.deployedBy
    this.deployedByUser = attr.deployedByUser
    this.deployedOn = attr.deployedOn
    this.createdOn = attr.createdOn
    this.updatedOn = attr.updatedOn
    this.#encryptedPassword = attr.password ?? undefined
    this.#decryptedPassword = undefined
  }

  //---------------------------------------------------------------------------

  #encryptedPassword?: string // contains `${ciphertext}::${iv}` pair
  #decryptedPassword?: string

  get hasPassword() {
    return this.#encryptedPassword != undefined
  }

  get password() {
    if (this.#encryptedPassword && this.#decryptedPassword) {
      return this.#decryptedPassword
    } else if (this.#encryptedPassword) {
      throw new Error("must call decryptPassword() first")
    } else {
      return undefined
    }
  }

  async setPassword(password: string | undefined, encryptKey: string) {
    if (password) {
      this.#decryptedPassword = password
      this.#encryptedPassword = await Deploy.encryptPassword(password, encryptKey)
      return this.#encryptedPassword
    } else {
      this.#decryptedPassword = undefined
      this.#encryptedPassword = undefined
    }
  }

  async decryptPassword(encryptKey: string) {
    this.#decryptedPassword = await Deploy.decryptPassword(this.#encryptedPassword, encryptKey)
    return this.#decryptedPassword
  }

  static async encryptPassword(password: string | undefined, encryptKey: string) {
    if (password) {
      const { ciphertext, iv } = await crypto.encrypt(password, encryptKey)
      return `${ciphertext}${PASSWORD_SEPARATOR}${iv}`
    }
  }

  static async decryptPassword(password: string | undefined, encryptKey: string) {
    if (password) {
      const [ciphertext, iv] = password.split(PASSWORD_SEPARATOR)
      return await crypto.decrypt(ciphertext, iv, encryptKey)
    }
  }

  //---------------------------------------------------------------------------

  static one(value: NewDeployAttributes) {
    return new Deploy(value)
  }

  static many(value: NewDeployAttributes[]) {
    return value.map((u) => new Deploy(u))
  }

  static maybe(value: NewDeployAttributes | undefined) {
    return value ? new Deploy(value) : undefined
  }

  //---------------------------------------------------------------------------

  static assert(value: unknown) {
    assert.true(value instanceof Deploy)
    return value as Deploy
  }
}

//-----------------------------------------------------------------------------

interface NewDeployAttributes {
  id: Id
  organizationId: Id
  gameId: Id
  game?: Game
  state: DeployState
  active: number
  slug: string
  path: string
  error?: string
  password?: string
  pinned?: boolean
  deployedBy: Id
  deployedByUser?: User
  deployedOn: DateTime
  createdOn: DateTime
  updatedOn: DateTime
}

//-----------------------------------------------------------------------------

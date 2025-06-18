import { assert } from "@lib"
import { httpError, Status } from "@lib/http"
import { Game, Organization, User } from "@domain"

//-------------------------------------------------------------------------------------------------

type Role =
  | "anonymous"
  | "active"
  | "sysadmin"
  | "disabled"
  | "member"

//-------------------------------------------------------------------------------------------------

type Resource = Organization | Game

//=================================================================================================
// IS user IN role - return boolean
//=================================================================================================

function is(user: User | undefined, role: Role, resource?: Resource) {
  const present = user !== undefined
  const disabled = present && user.disabled
  const active = present && !user.disabled
  const sysadmin = present && user.sysadmin
  switch (role) {
    case "anonymous":
      return !present
    case "active":
      return active
    case "disabled":
      return disabled
    case "sysadmin":
      return active && sysadmin
    case "member":
      return active && isMember(user, resource)
    default:
      assert.unreachable(role)
  }
}

function isMember(user: User, resource?: Resource) {
  if (user.sysadmin) {
    return true
  }
  assert.present(user.organizations, "missing user.organizations - did you forget to load withOrganizations")
  assert.present(resource)
  const oid = getOrganizationId(resource)
  return user.organizations.find((o) => o.id === oid) !== undefined
}

function getOrganizationId(resource: Resource) {
  if (resource instanceof Organization) {
    return resource.id
  } else if (resource instanceof Game) {
    return resource.organizationId
  } else {
    assert.unreachable(resource)
  }
}

//=================================================================================================
// AUTHORIZE user IS - throw AuthorizationError if not allowed
//=================================================================================================

class AuthorizationError extends httpError(Status.Forbidden) {}

function authorize(user: User | undefined, role: Role, resource?: Resource) {
  if (!is(user, role, resource)) {
    throw new AuthorizationError()
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export { AuthorizationError, authorize, is, type Role }

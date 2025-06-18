import { assert, Test } from "@test"

//-----------------------------------------------------------------------------

Test.domain("user belongs to org", ({ factory })=> {
  const user = factory.user.build()
  const org1 = factory.org.build()
  const org2 = factory.org.build()
  const org3 = factory.org.build()

  assert.throws(() => user.belongsTo(org1), Error, "organizations are not loaded")

  user.organizations = []
  assert.equals(user.belongsTo(org1), false)
  assert.equals(user.belongsTo(org2), false)
  assert.equals(user.belongsTo(org3), false)

  user.organizations = [org1, org2]
  assert.equals(user.belongsTo(org1), true)
  assert.equals(user.belongsTo(org2), true)
  assert.equals(user.belongsTo(org3), false)
})

//-----------------------------------------------------------------------------

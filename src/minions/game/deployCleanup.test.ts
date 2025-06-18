import { assert, Test, testMinionsContext } from "@test"
import { Deploy } from "@domain"
import { DeployCleanup } from "./deployCleanup.ts"

//-------------------------------------------------------------------------------------------------

Test.domain("DeployCleanup", async ({ domain, factory, clock }) => {
  const context = testMinionsContext(domain)
  const org = await factory.org.create()
  const user = await factory.user.create()
  const game = await factory.game.create({ organization: org })

  const freshDate = DateTime.fromMillis(clock.now.minus({ days: Deploy.ExpirationDays - 1 }).toMillis())
  const expiredDate = DateTime.fromMillis(clock.now.minus({ days: Deploy.ExpirationDays + 1 }).toMillis())

  const freshDeploy = await factory.deploy.create({ game: game, deployedByUser: user, id: 101, slug: "1a", deployedOn: freshDate })
  const expiredDeploy = await factory.deploy.create({ game: game, deployedByUser: user, id: 102, slug: "1b", deployedOn: expiredDate })

  const result = await DeployCleanup({ name: "deploy:cleanup" }, context)

  assert.equals(result, {
    deleted: 1,
    cleanedOn: clock.now,
  })
  const freshReloaded = await domain.games.getDeploy(freshDeploy.id)
  assert.present(freshReloaded)

  const expiredReloaded = await domain.games.getDeploy(expiredDeploy.id)
  assert.absent(expiredReloaded)
})

//-------------------------------------------------------------------------------------------------

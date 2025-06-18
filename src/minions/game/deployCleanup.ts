import { MinionsContext } from "@minions"

interface DeployCleanupData {
  name: "deploy:cleanup"
  ageInDays?: number
}

async function DeployCleanup(data: DeployCleanupData, ctx: MinionsContext) {
  const deploys = await ctx.domain.games.getExpiredDeploys(data?.ageInDays)
  let deleted = 0;
  for(const deploy of deploys){
    deleted += Number(await ctx.domain.games.deleteDeploy(deploy))
  }
  return {
    deleted,
    cleanedOn: ctx.domain.clock.now,
  }
}

export { DeployCleanup, type DeployCleanupData }

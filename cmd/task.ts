import "@std/dotenv/load"
import { build, secret } from "@task"

//-----------------------------------------------------------------------------

async function exec(task: string, args: string[]) {
  switch (task) {
    case "build":
      return await build.build(args[0])
    case "generate-signing-key":
      return await secret.generateSigningKey()
    case "generate-encrypt-key":
      return await secret.generateEncryptKey()
    default:
      console.error(`Unknown task ${task}`)
      Deno.exit(1)
  }
}

//-----------------------------------------------------------------------------

if (Deno.args.length === 0) {
  console.error("No task specified")
  Deno.exit(1)
}

const [task, ...args] = Deno.args
await exec(task, args)
Deno.exit(0)

//-----------------------------------------------------------------------------

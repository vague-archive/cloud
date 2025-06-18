import "@std/dotenv/load"
import { config } from "@config"
import { Domain } from "@domain"

const domain = await Domain.configure(config)

// reference unused variables to keep deno compiler happy
domain

async function onExit() {
  console.log("Goodbye...")
  await domain.close()
  Deno.exit()
}

console.log("Welcome to Void Cloud Console...")

Deno.addSignalListener("SIGINT", onExit)
Deno.addSignalListener("SIGTERM", onExit)
Deno.addSignalListener("SIGQUIT", onExit)

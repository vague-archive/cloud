import { exists } from "@std/fs"

type Entries = Record<string, string>

export type Manifest = (path: string) => string

export const defaultManifest = (path: string) => path

export function newManifest(entries: Entries): Manifest {
  return (path: string) => {
    return entries[path] ?? path
  }
}

export async function loadManifest(path: string): Promise<Manifest> {
  if (await exists(path)) {
    return newManifest(JSON.parse(await Deno.readTextFile(path)))
  } else {
    return defaultManifest
  }
}

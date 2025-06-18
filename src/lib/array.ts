import { assert, to } from "@lib"

//-----------------------------------------------------------------------------

export function startsWith<T>(a1: T[], a2: T | T[]) {
  a2 = to.array(a2)
  if (a2.length > a1.length) {
    return false
  }
  for (let i = 0; i < a2.length; i++) {
    if (a2[i] !== a1[i]) {
      return false
    }
  }
  return true
}

//-----------------------------------------------------------------------------

export function compare(local: string[], remote: string[], sorted = false) {
  if (!sorted) {
    local.sort()
    remote.sort()
  }
  const missingRemote: string[] = []
  const missingLocal: string[] = []
  let l = 0, r = 0
  while (l < local.length || r < remote.length) {
    if (l < local.length && (r >= remote.length || (local[l] < remote[r]))) {
      missingRemote.push(local[l])
      l++
    } else if (r < remote.length && (l >= local.length || (remote[r] < local[l]))) {
      missingLocal.push(remote[r])
      r++
    } else {
      l++
      r++
    }
  }
  return {
    missingLocal,
    missingRemote,
  }
}

//-----------------------------------------------------------------------------

interface ChunkCount {
  count: number
}

interface ChunkSize {
  size: number
}

type ChunkOptions = ChunkCount | ChunkSize

function hasChunkSize(value: ChunkOptions): value is ChunkSize {
  return "size" in value
}

export function chunk<T>(input: T[], options: ChunkOptions) {
  const size = hasChunkSize(options) ? Math.floor(options.size) : Math.ceil(input.length / options.count)
  const chunks: T[][] = []
  assert.true(size > 0)
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size))
  }
  return chunks
}

//-----------------------------------------------------------------------------

export function shuffle<T>(arr: T[]): T[] {
  let i = arr.length
  while (i) {
    const j = Math.floor(Math.random() * i--)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

//-----------------------------------------------------------------------------

//-----------------------------------------------------------------------------

type Cls =
  | undefined
  | null
  | string
  | Record<string, boolean | null | undefined>
  | Cls[]

export function cls(...args: Cls[]): string {
  return clsToString(args)
}

function clsToString(cls: Cls): string {
  if (cls) {
    if (Array.isArray(cls)) {
      return cls.map((c) => clsToString(c)).filter((c) => c.length > 0).join(" ")
    } else if (typeof cls === "string") {
      return cls.trim()
    } else if (cls && typeof cls === "object") {
      return clsToString(Object.entries(cls).map(([k, v]) => v ? k : undefined))
    }
  }
  return ""
}

//-----------------------------------------------------------------------------

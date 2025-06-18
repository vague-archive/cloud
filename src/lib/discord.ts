import { z } from "@deps"
import { ContentType, Header, Status } from "@lib/http"

//------------------------------------------------------------------------------

export const apiEndpoint = new URL("https://discord.com/api/v10/")

//------------------------------------------------------------------------------

interface RequestOptions {
  token: string
}

//------------------------------------------------------------------------------

async function api(path: string, { token }: RequestOptions) {
  const url = new URL(path, apiEndpoint)
  const response = await fetch(url, {
    headers: {
      [Header.Authorization]: `Bearer ${token}`,
    },
  })

  if (response.status !== Status.OK) {
    throw new Error(`unexpected discord api response ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get(Header.ContentType)
  if (!contentType?.startsWith(ContentType.Json)) {
    throw new Error(`unexpected discord api response content type ${contentType}`)
  }

  return await response.json()
}

//------------------------------------------------------------------------------

interface DiscordUser {
  identifier: string
  username: string
  name: string
  email?: string
  avatar?: string
}

export async function getAuthenticatedUser(token: string): Promise<DiscordUser> {
  const schema = z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
  })

  const response = await api("users/@me", { token })
  const result = schema.parse(response)
  return {
    identifier: result.id,
    username: result.username,
    name: result.global_name ?? result.username,
    email: result.email ?? undefined,
    avatar: result.avatar ?? undefined,
  }
}

//------------------------------------------------------------------------------

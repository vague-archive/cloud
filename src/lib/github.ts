import { z, zod } from "@deps"
import { assert } from "@lib"
import { SerializableObject } from "@lib/serialize"
import { ContentType, Header, Status } from "@lib/http"

//------------------------------------------------------------------------------

const GITHUB_API_ENDPOINT = new URL("https://api.github.com")
const GITHUB_API_VERSION = "2022-11-28"
const GITHUB_API_VERSION_HEADER = "X-Github-Api-Version"
const GITHUB_API_ACCEPT = "application/vnd.github+json"

//------------------------------------------------------------------------------

interface RequestOptions {
  token: string
}

//------------------------------------------------------------------------------

async function api(path: string, { token }: RequestOptions) {
  const url = new URL(path, GITHUB_API_ENDPOINT)
  const response = await fetch(url, {
    headers: {
      [Header.Accept]: GITHUB_API_ACCEPT,
      [Header.Authorization]: `Bearer ${token}`,
      [GITHUB_API_VERSION_HEADER]: GITHUB_API_VERSION,
    },
  })

  if (response.status !== Status.OK) {
    throw new Error(`unexpected github api response ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get(Header.ContentType)
  if (!contentType?.startsWith(ContentType.Json)) {
    throw new Error(`unexpected github api response content type ${contentType}`)
  }

  return await response.json()
}

//------------------------------------------------------------------------------

interface GithubUser {
  identifier: number
  username: string
  name: string
  email?: string
  avatarUrl?: string
}

async function getAuthenticatedUser(token: string): Promise<GithubUser> {
  const schema = z.object({
    id: z.number(),
    login: z.string(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    avatar_url: z.string().optional().nullable(),
  })

  const response = await api("/user", { token })
  const result = schema.parse(response)
  return {
    identifier: result.id,
    username: result.login,
    name: result.name ?? result.login,
    email: result.email ?? undefined,
    avatarUrl: result.avatar_url ?? undefined,
  }
}

//------------------------------------------------------------------------------

interface Release extends SerializableObject {
  id: number
  name: string
  tagName: string
  draft: boolean
  prerelease: boolean
  publishedAt: DateTime
  body: string
  assets: ReleaseAsset[]
}

interface ReleaseAsset extends SerializableObject {
  id: number
  name: string
  contentType: string
  contentLength: number
  url: string
  platform: ReleasePlatform
}

enum ReleasePlatform {
  AppleArm = "apple:arm",
  AppleIntel = "apple:intel",
  Windows = "windows",
  LinuxArm = "linux:arm",
  LinuxIntel = "linux:intel",
  Unknown = "unknown",
}

const ReleaseSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  tag_name: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.string(),
  body: z.string().nullable(),
  assets: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      content_type: z.string(),
      size: z.number(),
      url: z.string(),
      platform: z.nativeEnum(ReleasePlatform).default(ReleasePlatform.Unknown),
    }),
  ),
})

function mapGitHubRelease(release: zod.infer<typeof ReleaseSchema>): Release {
  return {
    id: release.id,
    name: release.name ?? "",
    tagName: release.tag_name,
    draft: release.draft,
    prerelease: release.prerelease,
    publishedAt: DateTime.fromISO(release.published_at),
    body: release.body ?? "",
    assets: release.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      contentType: asset.content_type,
      contentLength: asset.size,
      url: asset.url,
      platform: identifyReleasePlatform(asset.name),
    })),
  }
}

/*
 * IMPORTANT: this relies on void teams using a consistent naming convention for their
 *            releases
 */
function identifyReleasePlatform(name: string) {
  if (name.includes("darwin")) {
    if (name.includes("arm64"))
      return ReleasePlatform.AppleArm
    else if (name.includes("x64") || name.includes("x86"))
      return ReleasePlatform.AppleIntel
  } else if (name.includes("linux")) {
    if (name.includes("arm64"))
      return ReleasePlatform.LinuxArm
    else if (name.includes("x64") || name.includes("x86"))
      return ReleasePlatform.LinuxIntel
  } else if (
    name.endsWith(".msi") ||
    name.endsWith(".exe") ||
    name.includes("windows") ||
    name.includes("win32")
  ) {
    return ReleasePlatform.Windows
  }
  return ReleasePlatform.Unknown
}

function releasePlatformLabel(platform: ReleasePlatform) {
  switch (platform) {
    case ReleasePlatform.AppleArm:
      return "Mac (M-Series)"
    case ReleasePlatform.AppleIntel:
      return "Mac (Intel)"
    case ReleasePlatform.Windows:
      return "Windows"
    case ReleasePlatform.LinuxArm:
      return "Linux (M-Series)"
    case ReleasePlatform.LinuxIntel:
      return "Linux (Intel)"
    case ReleasePlatform.Unknown:
      return "Unknown"
    default:
      assert.unreachable(platform)
  }
}

//------------------------------------------------------------------------------

async function getLatestRelease(owner: string, repo: string, token: string): Promise<Release> {
  const schema = ReleaseSchema
  const response = await api(`/repos/${owner}/${repo}/releases/latest`, { token })
  const result = schema.parse(response)
  return mapGitHubRelease(result)
}

async function getReleases(owner: string, repo: string, token: string): Promise<Release[]> {
  const schema = ReleaseSchema.array()
  const response = await api(`/repos/${owner}/${repo}/releases`, { token })
  const result = schema.parse(response)
  return result
    .map((release) => mapGitHubRelease(release))
    .filter((release) => !release.draft)
    .sort((a, b) => b.publishedAt.toMillis() - a.publishedAt.toMillis());
}

//==============================================================================
// GITHUB PUBLIC EXPORTS
//==============================================================================

export {
  getAuthenticatedUser,
  getLatestRelease,
  getReleases,
  identifyReleasePlatform,
  type Release,
  type ReleaseAsset,
  ReleasePlatform,
  releasePlatformLabel,
}

//------------------------------------------------------------------------------

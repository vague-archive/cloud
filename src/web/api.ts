import { Share } from "@web/api/share.ts"
import { DownloadEndpoints } from "@web/api/download.ts"
import { Validate } from "@web/api/validateAuth.ts"
import { GetUserOrganizations } from "@web/api/organizations.ts"

export const Api = {
  Share,
  Download: DownloadEndpoints,
  Validate,
  GetUserOrganizations,
}

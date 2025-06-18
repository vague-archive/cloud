import { decodeBase64, encodeBase64 } from "@std/encoding"

import assert       from "@lib/assert"
import is           from "@lib/is"
import to           from "@lib/to"
import * as array   from "@lib/array"
import * as crypto  from "@lib/crypto"
import * as discord from "@lib/discord"
import * as github  from "@lib/github"
import * as i18n    from "@lib/i18n"

const enc64 = encodeBase64
const dec64 = decodeBase64

export {
  array,
  assert,
  crypto,
  discord,
  enc64, dec64,
  github,
  i18n,
  is,
  to,
}

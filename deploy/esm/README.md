# Void's private ESM package registry

The @vaguevoid SDK is currently hosted as a private NPM package in the Github package registry
at `https://npm.pkg.github.com/@vaguevoid/sdk`. Our game developers are currently developing
using one of:

  * [bun](https://bun.sh/) using a [bunfig.toml](https://bun.sh/docs/runtime/bunfig#install-scopes)
    file to specify the scoped registry URL and authentication token.
  * [npm](https://www.npmjs.com/) using an [.npmrc](https://docs.npmjs.com/cli/v10/configuring-npm/npmrc#auth-related-configuration)
    file to specify the scoped registry URL and authentication token.

However, our cloud services are using a server side [deno](https://deno.com/) environment which
currently does NOT support loading **private** NPM packages. So if we need the SDK for any reason
we have a problem. For the most part, we don't use the SDK because we're a set of server side
cloud services. However we are starting to inject functionality into games hosted in our cloud
service. We do this by bundling and injecting a `<script src="/cloud.js"></script>` into the
game's HTML layout. This bundle DOES require some SDK support. For example it embeds a cloud
version of the VCR.

If the SDK was a public NPM package this would be easy using deno's support for importing via
`npm:@vaguevoid/sdk` declarations. However, it's not public, so we need an alternative...

## Solution

After investigating a number of solutions [see issue #163](https://github.com/vaguevoid/cloud/issues/163)
we've decided that we can (privately) host deno compatible version of the SDK as esm modules using
a privately hosted [esm.sh](https://esm.sh/) server as [described here](https://github.com/esm-dev/esm.sh/blob/main/HOSTING.md)
. The server configuration will be scoped to just our SDK with something like...

```jsonc
{
  "npmRegistry": "https://npm.pkg.github.com",
  "npmRegistryScope": "@vaguevoid",
  "npmToken": "**********",  // the token used to authenticate against the github repository
  "authSecret": "**********" // the secret used by our application to access this server
}
```

> NOTE: we don't actually store `npmToken` or `authSecret` in the config file, this is for example
only. We actually provide them in the hosting environment as `NPM_TOKEN` and `SERVER_AUTH_SECRET`
environment variables.

With an instance of this server hosted at `https://esm.void.dev` (via fly.io) we can import the
SDK in a deno application using a URL like

```typescript
import { secondsToFrames } from "https://esm.void.dev/@vaguevoid/sdk@0.3.139"
```

And deno DOES support loading private ESM modules via the [DENO_AUTH_TOKENS](https://docs.deno.com/runtime/manual/basics/modules/private)
environment variable which can be set like so:

```bash
DENO_AUTH_TOKENS=*********@esm.void.dev
```

Which is a really long winded way of saying everything should work if you set your `DENO_AUTH_TOKENS`
environment variable correctly.


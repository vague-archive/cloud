import { assert, bypass, Test } from "@test"
import { IdentityProvider } from "@domain"
import { OAuthProviders } from "@web/oauth.ts"

//-------------------------------------------------------------------------------------------------

Test("empty providers", () => {
  const providers = new OAuthProviders({})
  assert.equals(providers.has(IdentityProvider.Github),    false)
  assert.equals(providers.has(IdentityProvider.Discord),   false)
  assert.equals(providers.has(IdentityProvider.Google),    false)
  assert.equals(providers.has(IdentityProvider.Microsoft), false)
})

//-------------------------------------------------------------------------------------------------

Test("Github provider", async () => {
  const providers = new OAuthProviders({
    github: {
      clientId: "github-client-id",
      clientSecret: "github-client-secret",
    },
  })
  assert.equals(providers.has(IdentityProvider.Github),    true)
  assert.equals(providers.has(IdentityProvider.Discord),   false)
  assert.equals(providers.has(IdentityProvider.Google),    false)
  assert.equals(providers.has(IdentityProvider.Microsoft), false)

  const provider = providers.get(IdentityProvider.Github)
  assert.present(provider)

  assert.equals(provider.name, IdentityProvider.Github)
  assert.equals(provider.config, {
    clientId: "github-client-id",
    clientSecret: "github-client-secret",
    authorizationEndpointUri: "https://github.com/login/oauth/authorize",
    tokenUri: "https://github.com/login/oauth/access_token",
  })

  const server = bypass.server(
    bypass.handler.get("https://api.github.com/user", () =>
      bypass.json({
        login: "jakesgordon",
        id: 123,
        avatar_url: "https://avatars.githubusercontent.com/u/123",
        name: "Jake Gordon",
        email: "jakesgordon@gmail.com",
      })),
  )
  server.listen()

  const identity = await provider.identify("identity-token")
  assert.present(identity)
  assert.equals(identity.provider, IdentityProvider.Github)
  assert.equals(identity.identifier, "123")
  assert.equals(identity.username, "jakesgordon")
  assert.equals(identity.name, "Jake Gordon")
  assert.equals(identity.email, "jakesgordon@gmail.com")

  server.close()
})

//-------------------------------------------------------------------------------------------------

Test("Discord provider", async () => {
  const providers = new OAuthProviders({
    discord: {
      clientId: "discord-client-id",
      clientSecret: "discord-client-secret",
    },
  })
  assert.equals(providers.has(IdentityProvider.Github),    false)
  assert.equals(providers.has(IdentityProvider.Discord),   true)
  assert.equals(providers.has(IdentityProvider.Google),    false)
  assert.equals(providers.has(IdentityProvider.Microsoft), false)

  const provider = providers.get(IdentityProvider.Discord)
  assert.present(provider)

  assert.equals(provider.name, IdentityProvider.Discord)
  assert.equals(provider.config, {
    clientId: "discord-client-id",
    clientSecret: "discord-client-secret",
    authorizationEndpointUri: "https://discord.com/oauth2/authorize",
    tokenUri: "https://discord.com/api/oauth2/token",
    defaults: {
      scope: "identify email",
    },
  })

  const server = bypass.server(
    bypass.handler.get("https://discord.com/api/v10/users/@me", () =>
      bypass.json({
        id: "123",
        username: "jakesgordon",
        avatar: "123456",
        global_name: "Jake Gordon",
        email: "jakesgordon@gmail.com",
      })),
  )
  server.listen()

  const identity = await provider.identify("identity-token")
  assert.present(identity)
  assert.equals(identity.provider, IdentityProvider.Discord)
  assert.equals(identity.identifier, "123")
  assert.equals(identity.username, "jakesgordon")
  assert.equals(identity.name, "Jake Gordon")
  assert.equals(identity.email, "jakesgordon@gmail.com")

  server.close()
})

//-------------------------------------------------------------------------------------------------

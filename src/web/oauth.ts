import { oauth2 } from "@deps"
import { oAuthConfig } from "@config"
import { discord, github } from "@lib"
import { IdentityProvider } from "@domain"

//=============================================================================
// OAuth PROVIDER CONFIGURATION
// - shared between LoginPage and JoinPage
//=============================================================================

interface OAuthIdentity {
  provider: IdentityProvider
  identifier: string
  username: string
  name: string
  email?: string
}

interface OAuthProviderOptions {
  clientId: string
  clientSecret: string
}

interface OAuthProvider {
  name: IdentityProvider
  config: oauth2.OAuth2ClientConfig
  identify: (token: string) => Promise<OAuthIdentity | undefined>
}

//-------------------------------------------------------------------------------------------------

class OAuthProviders {
  private github?: OAuthProvider
  private discord?: OAuthProvider

  constructor(config: Partial<Record<IdentityProvider, oAuthConfig | undefined>>) {
    this.github = config.github && githubProvider({ ...config.github })
    this.discord = config.discord && discordProvider({ ...config.discord })
  }

  has(provider: IdentityProvider) {
    return this.get(provider) !== undefined
  }

  get(provider: string) {
    switch (provider) {
      case IdentityProvider.Github:  return this.github
      case IdentityProvider.Discord: return this.discord
    }
  }

  client(provider: OAuthProvider, redirectUri: string | URL) {
    return new oauth2.OAuth2Client({
      ...provider.config,
      redirectUri: redirectUri.toString(),
    })
  }
}

//-------------------------------------------------------------------------------------------------

function githubProvider({ clientId, clientSecret }: OAuthProviderOptions): OAuthProvider {
  return {
    name: IdentityProvider.Github,
    config: {
      clientId,
      clientSecret,
      authorizationEndpointUri: "https://github.com/login/oauth/authorize",
      tokenUri: "https://github.com/login/oauth/access_token",
    },
    identify: async (token: string) => {
      const user = await github.getAuthenticatedUser(token)
      return {
        provider: IdentityProvider.Github,
        identifier: user.identifier.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
      }
    },
  }
}

//-------------------------------------------------------------------------------------------------

function discordProvider({ clientId, clientSecret }: OAuthProviderOptions): OAuthProvider {
  return {
    name: IdentityProvider.Discord,
    config: {
      clientId,
      clientSecret,
      authorizationEndpointUri: "https://discord.com/oauth2/authorize",
      tokenUri: "https://discord.com/api/oauth2/token",
      defaults: {
        scope: "identify email",
      },
    },
    identify: async (token: string) => {
      const user = await discord.getAuthenticatedUser(token)
      return {
        provider: IdentityProvider.Discord,
        identifier: user.identifier,
        username: user.username,
        name: user.name,
        email: user.email,
      }
    },
  }
}

//=============================================================================
// EXPORTS
//=============================================================================

export {
  type OAuthProvider,
  OAuthProviders,
}

//-------------------------------------------------------------------------------------------------

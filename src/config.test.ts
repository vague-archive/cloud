import { assert, Test } from "@test"
import { configure, DefaultEncryptKey, DefaultSigningKey, parseDatabaseUrl } from "@config"

//-----------------------------------------------------------------------------

Test("default configuration", () => {
  const env = new Map()
  const config = configure(env)
  assert.equals(config, {
    keys: {
      signingKey: DefaultSigningKey,
      encryptKey: DefaultEncryptKey,
    },
    contact: {
      supportEmail: "support@void.dev",
    },
    github: {
      oauth: undefined,
      accessToken: undefined,
    },
    discord: {
      oauth: undefined,
    },
    aws: {
      region: "us-west-2",
      credentials: undefined,
    },
    web: {
      host: "localhost",
      port: 3000,
      publicRoot: "public",
      publicUrl: new URL("http://localhost:3000"),
      secure: false,
      certFile: undefined,
      keyFile: undefined,
      trustProxyHeaders: false,
      sessionCookie: {
        name: "void-cloud-session",
        options: {
          path: "/",
          httpOnly: true,
          secure: false,
          ignoreInsecure: true,
          signed: true,
          sameSite: "lax",
          maxAge: 60*60*24*7,
        }
      },
      identityCookie: {
        name: "void-cloud-identity",
        options: {
          path: "/",
          httpOnly: true,
          secure: false,
          ignoreInsecure: true,
          signed: true,
          sameSite: "lax",
          maxAge: 60*60*24*7,
        }
      },
      hmr: false,
      waf: false,
    },
    filestore: {
      host: "localhost",
      port: 3001,
      url: new URL("http://localhost:3001"),
      root: ".filestore",
      bucket: undefined,
    },
    database: {
      host: "localhost",
      port: 3306,
      user: "void",
      password: "void",
      database: "void",
      ssl: undefined,
    },
    redis: {
      cache: {
        url: "redis://localhost:6379/0",
      },
      workers: {
        url: "redis://localhost:6379/1",
      },
    },
    mailer: {
      enabled: false,
      apiToken: undefined,
      productName: "Void",
      productUrl: "http://localhost:3000/",
      supportEmail: "support@void.dev",
    },
    test: {
      database: {
        host: "localhost",
        port: 3306,
        user: "void",
        password: "void",
        database: "void_test",
        ssl: undefined,
      },
      redis: {
        url: "redis://localhost:6379/10",
      },
    },
    logger: {
      level: "debug",
      metadata: undefined,
      colorized: true,
      papertrailToken: undefined,
      papertrailApp: "void-cloud-dev",
    },
    features: {
      example: false
    },
  })
})

//-----------------------------------------------------------------------------

Test("fully customized configuration", () => {
  const env = new Map([
    ["HOST", "127.0.0.1"],
    ["PORT", "8080"],
    ["URL_SCHEME", "https"],
    ["URL_HOST", "play.void.dev"],
    ["URL_PORT", "443"],
    ["DATABASE_URL", 'mysql://super:secret@database:3306/voiddb?ssl={"rejectUnauthorized":true}'],
    ["TEST_DATABASE_URL", "mysql://test:stuff@test-database:3307/testdb"],
    ["GITHUB_ACCESS_TOKEN", "github-access-token"],
    ["GITHUB_CLIENT_ID", "github-id"],
    ["GITHUB_CLIENT_SECRET", "github-secret"],
    ["DISCORD_CLIENT_ID", "discord-id"],
    ["DISCORD_CLIENT_SECRET", "discord-secret"],
    ["SIGNING_KEY", "custom-signing-key"],
    ["ENCRYPT_KEY", "custom-encrypt-key"],
    ["SUPPORT_EMAIL", "custom-support@void.dev"],
    ["AWS_REGION", "us-east-1"],
    ["AWS_ACCESS_KEY_ID", "aws-access-key-id"],
    ["AWS_SECRET_KEY", "aws-secret-key"],
    ["FILESTORE_HOST", "custom-filestore-host"],
    ["FILESTORE_PORT", "8080"],
    ["FILESTORE_URL", "http://files.process.void-cloud.internal:8080"],
    ["FILESTORE_ROOT", "/files"],
    ["FILESTORE_BUCKET", "void-cloud-custom-bucket"],
    ["LOG_LEVEL", "warn"],
    ["LOG_METADATA", "pretty"],
    ["LOG_COLORIZED", "false"],
    ["PAPERTRAIL_TOKEN", "papertrail-token"],
    ["PAPERTRAIL_APP", "papertrail-app"],
    ["REDIS_CACHE_URL", "redis://redis-host:6379/10"],
    ["REDIS_WORKERS_URL", "redis://redis-host:6379/11"],
    ["REDIS_TEST_URL", "redis://redis-host:6379/15"],
    ["TRUST_PROXY_HEADERS", "true"],
    ["SESSION_COOKIE_NAME", "custom-session-cookie-name"],
    ["IDENTITY_COOKIE_NAME", "custom-identity-cookie-name"],
    ["MAILER_ENABLED", "true"],
    ["POSTMARK_API_TOKEN", "postmark-api-token"],
    ["HMR", "true"],
    ["WAF", "true"],
    ["FEATURE_EXAMPLE", "true"],
    ["HTTPS_CERT_FILE", "certificate.pem"],
    ["HTTPS_KEY_FILE", "certificate.key"],
  ])
  const config = configure(env)
  assert.equals(config, {
    keys: {
      signingKey: "custom-signing-key",
      encryptKey: "custom-encrypt-key",
    },
    contact: {
      supportEmail: "custom-support@void.dev",
    },
    github: {
      oauth: {
        clientId: "github-id",
        clientSecret: "github-secret",
      },
      accessToken: "github-access-token",
    },
    discord: {
      oauth: {
        clientId: "discord-id",
        clientSecret: "discord-secret",
      },
    },
    aws: {
      region: "us-east-1",
      credentials: {
        awsAccessKeyId: "aws-access-key-id",
        awsSecretKey: "aws-secret-key",
      },
    },
    web: {
      host: "127.0.0.1",
      port: 8080,
      publicRoot: "public",
      publicUrl: new URL("https://play.void.dev"),
      secure: true,
      certFile: "certificate.pem",
      keyFile: "certificate.key",
      trustProxyHeaders: true,
      sessionCookie: {
        name: "custom-session-cookie-name",
        options: {
          path: "/",
          httpOnly: true,
          secure: true,
          ignoreInsecure: true,
          signed: true,
          sameSite: "lax",
          maxAge: 60*60*24*7,
        }
      },
      identityCookie: {
        name: "custom-identity-cookie-name",
        options: {
          path: "/",
          httpOnly: true,
          secure: true,
          ignoreInsecure: true,
          signed: true,
          sameSite: "lax",
          maxAge: 60*60*24*7,
        }
      },
      hmr: true,
      waf: true,
    },
    filestore: {
      host: "custom-filestore-host",
      port: 8080,
      url: new URL("http://files.process.void-cloud.internal:8080"),
      root: "/files",
      bucket: "void-cloud-custom-bucket",
    },
    database: {
      host: "database",
      port: 3306,
      user: "super",
      password: "secret",
      database: "voiddb",
      ssl: {
        rejectUnauthorized: true,
      },
    },
    redis: {
      cache: {
        url: "redis://redis-host:6379/10",
      },
      workers: {
        url: "redis://redis-host:6379/11",
      },
    },
    mailer: {
      enabled: true,
      apiToken: "postmark-api-token",
      productName: "Void",
      productUrl: "https://play.void.dev/",
      supportEmail: "custom-support@void.dev",
    },
    test: {
      database: {
        host: "test-database",
        port: 3307,
        user: "test",
        password: "stuff",
        database: "testdb",
        ssl: undefined,
      },
      redis: {
        url: "redis://redis-host:6379/15",
      },
    },
    logger: {
      level: "warn",
      metadata: "pretty",
      colorized: false,
      papertrailToken: "papertrail-token",
      papertrailApp: "papertrail-app",
    },
    features: {
      example: true
    },
  })
})

//-----------------------------------------------------------------------------

Test("invalid listen port throws an error", () => {
  const env = new Map([["PORT", "not-a-number"]])
  const err = assert.throws(() => configure(env))
  assert.instanceOf(err, Error)
  assert.equals(err.message, "PORT is not a number")
})

Test("invalid url port throws an error", () => {
  const env = new Map([["URL_PORT", "not-a-number"]])
  const err = assert.throws(() => configure(env))
  assert.instanceOf(err, Error)
  assert.equals(err.message, "URL_PORT is not a number")
})

Test("missing database port defaults to 3306", () => {
  const env = new Map([
    ["DATABASE_URL", "mysql://user@database/database"],
  ])
  const config = configure(env)
  assert.equals(config.database.port, 3306)
})

//-----------------------------------------------------------------------------

Test("parse database url", () => {
  assert.equals(parseDatabaseUrl("mysql://localhost"), {
    host: "localhost",
    port: 3306,
    user: "",
    password: "",
    database: "",
    ssl: undefined,
  })

  assert.equals(parseDatabaseUrl("mysql://user:password@localhost:3306/database"), {
    host: "localhost",
    port: 3306,
    user: "user",
    password: "password",
    database: "database",
    ssl: undefined,
  })

  assert.equals(
    parseDatabaseUrl(`mysql://super:secret@database:3307/voiddb?ssl={"rejectUnauthorized":true}`),
    {
      host: "database",
      port: 3307,
      user: "super",
      password: "secret",
      database: "voiddb",
      ssl: {
        rejectUnauthorized: true,
      },
    },
  )

  assert.throws(() => parseDatabaseUrl(""), Error, "Invalid URL: ''")
  assert.throws(() => parseDatabaseUrl("not a url"), Error, "Invalid URL: 'not a url'")
})

//-----------------------------------------------------------------------------

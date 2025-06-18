import { z } from "@deps"
import { to } from "@lib/to"
import { CookieOptions } from "@web"

//-----------------------------------------------------------------------------

export const DefaultSigningKey =
  "Zqlkii6IEpmFILaNd0ZZGFfbLqGZgFrJopnnjPttGywzuxpJnNuC90AV9+GqkXjeSjQDn1AR7Cdz1Hd7iOcusA9cV9OGRuhIVBgNch1MacLYwkJBIwPL3oyfk9BCrO03i5w34KfoY9GFr9CZ61kpGP90InGWUiF2GbyEsAishKo="

export const DefaultEncryptKey = "x+eLvtCTh0dXznoyLt3gOGtGZWrvBmlz0u1Qqd1qmMU="

//-----------------------------------------------------------------------------

enum KEY {
  HOST = "HOST",
  PORT = "PORT",
  URL_SCHEME = "URL_SCHEME",
  URL_HOST = "URL_HOST",
  URL_PORT = "URL_PORT",
  DATABASE_URL = "DATABASE_URL",
  TEST_DATABASE_URL = "TEST_DATABASE_URL",
  GITHUB_ACCESS_TOKEN = "GITHUB_ACCESS_TOKEN",
  GITHUB_CLIENT_ID = "GITHUB_CLIENT_ID",
  GITHUB_CLIENT_SECRET = "GITHUB_CLIENT_SECRET",
  DISCORD_CLIENT_ID = "DISCORD_CLIENT_ID",
  DISCORD_CLIENT_SECRET = "DISCORD_CLIENT_SECRET",
  SIGNING_KEY = "SIGNING_KEY",
  ENCRYPT_KEY = "ENCRYPT_KEY",
  SUPPORT_EMAIL = "SUPPORT_EMAIL",
  AWS_REGION = "AWS_REGION",
  AWS_ACCESS_KEY_ID = "AWS_ACCESS_KEY_ID",
  AWS_SECRET_KEY = "AWS_SECRET_KEY",
  LOG_LEVEL = "LOG_LEVEL",
  LOG_METADATA = "LOG_METADATA",
  LOG_COLORIZED = "LOG_COLORIZED",
  PAPERTRAIL_TOKEN = "PAPERTRAIL_TOKEN",
  PAPERTRAIL_APP = "PAPERTRAIL_APP",
  FILESTORE_HOST = "FILESTORE_HOST",
  FILESTORE_PORT = "FILESTORE_PORT",
  FILESTORE_URL = "FILESTORE_URL",
  FILESTORE_ROOT = "FILESTORE_ROOT",
  FILESTORE_BUCKET = "FILESTORE_BUCKET",
  REDIS_CACHE_URL = "REDIS_CACHE_URL",
  REDIS_WORKERS_URL = "REDIS_WORKERS_URL",
  REDIS_TEST_URL = "REDIS_TEST_URL",
  TRUST_PROXY_HEADERS = "TRUST_PROXY_HEADERS",
  SESSION_COOKIE_NAME = "SESSION_COOKIE_NAME",
  IDENTITY_COOKIE_NAME = "IDENTITY_COOKIE_NAME",
  MAILER_ENABLED = "MAILER_ENABLED",
  POSTMARK_API_TOKEN = "POSTMARK_API_TOKEN",
  HMR = "HMR",
  FEATURE_EXAMPLE = "FEATURE_EXAMPLE",
  HTTPS_CERT_FILE = "HTTPS_CERT_FILE", // ONLY USED FOR LOCAL TESTING HTTPS (we offload SSL to our ALB in production)
  HTTPS_KEY_FILE = "HTTPS_KEY_FILE",   // ... you can use mkcert to generate a certificate (https://github.com/FiloSottile/mkcert)
  WAF = "WAF",
}

type DATABASE_KEY = KEY.DATABASE_URL | KEY.TEST_DATABASE_URL
type REDIS_KEY = KEY.REDIS_CACHE_URL | KEY.REDIS_WORKERS_URL | KEY.REDIS_TEST_URL

const DEFAULTS: Defaults = {
  HOST: "localhost",
  PORT: "3000",
  URL_SCHEME: undefined,
  URL_HOST: undefined,
  URL_PORT: undefined,
  DATABASE_URL: "mysql://void:void@localhost:3306/void",
  TEST_DATABASE_URL: "mysql://void:void@localhost:3306/void_test",
  GITHUB_ACCESS_TOKEN: undefined,
  GITHUB_CLIENT_ID: undefined,
  GITHUB_CLIENT_SECRET: undefined,
  DISCORD_CLIENT_ID: undefined,
  DISCORD_CLIENT_SECRET: undefined,
  SIGNING_KEY: DefaultSigningKey,
  ENCRYPT_KEY: DefaultEncryptKey,
  SUPPORT_EMAIL: "support@void.dev",
  AWS_REGION: "us-west-2",
  AWS_ACCESS_KEY_ID: undefined,
  AWS_SECRET_KEY: undefined,
  LOG_METADATA: undefined,
  LOG_COLORIZED: "true",
  LOG_LEVEL: "debug",
  PAPERTRAIL_TOKEN: undefined,
  PAPERTRAIL_APP: "void-cloud-dev",
  FILESTORE_HOST: "localhost",
  FILESTORE_PORT: "3001",
  FILESTORE_URL: undefined,
  FILESTORE_ROOT: ".filestore",
  FILESTORE_BUCKET: undefined,
  REDIS_CACHE_URL: "redis://localhost:6379/0",
  REDIS_WORKERS_URL: "redis://localhost:6379/1",
  REDIS_TEST_URL: "redis://localhost:6379/10",
  TRUST_PROXY_HEADERS: "false",
  SESSION_COOKIE_NAME: "void-cloud-session",
  IDENTITY_COOKIE_NAME: "void-cloud-identity",
  MAILER_ENABLED: "false",
  POSTMARK_API_TOKEN: undefined,
  HMR: "false",
  FEATURE_EXAMPLE: "false",
  HTTPS_CERT_FILE: undefined,
  HTTPS_KEY_FILE: undefined,
  WAF: "false",
}

//-----------------------------------------------------------------------------

type Defaults = Record<KEY, string | undefined>

export interface Config {
  keys: KeyConfig
  github: GitHubConfig
  discord: DiscordConfig
  aws: AwsConfig
  web: WebConfig
  database: DatabaseConfig
  filestore: FilestoreConfig
  mailer: MailerConfig
  test: {
    database: DatabaseConfig
    redis: RedisConfig
  }
  redis: {
    cache: RedisConfig
    workers: RedisConfig
  }
  logger: LoggerConfig
  contact: ContactConfig
  features: FeaturesConfig
}

export interface KeyConfig {
  signingKey: string
  encryptKey: string
}

interface GitHubConfig {
  oauth?: oAuthConfig
  accessToken?: string
}

interface DiscordConfig {
  oauth?: oAuthConfig
}

export interface oAuthConfig {
  clientId: string
  clientSecret: string
}

interface FilestoreConfig {
  host: string
  port: number
  url: URL
  root: string
  bucket?: string
}

interface MailerConfig {
  enabled: boolean
  apiToken?: string
  productName: string
  productUrl: string
  supportEmail: string
}

interface RedisConfig {
  url: string
}

interface AwsConfig {
  region: string
  credentials?: {
    awsAccessKeyId: string
    awsSecretKey: string
  }
}

interface WebConfig {
  host: string
  port: number
  publicRoot: string
  publicUrl: URL
  secure: boolean
  certFile?: string
  keyFile?: string
  trustProxyHeaders: boolean
  sessionCookie: {
    name: string
    options: CookieOptions
  }
  identityCookie: {
    name: string
    options: CookieOptions
  }
  hmr: boolean
  waf: boolean
}

interface LoggerConfig {
  level: LogLevelConfig
  metadata?: string
  colorized: boolean
  papertrailToken?: string
  papertrailApp?: string
}

interface ContactConfig {
  supportEmail: string
}

interface FeaturesConfig {
  example: boolean
}

//-----------------------------------------------------------------------------

interface Env {
  get(key: string): string | undefined
}

export function configure(env: Env) {
  return new Configurator(env, DEFAULTS).configure()
}

//-----------------------------------------------------------------------------

class Configurator {
  private env: Env
  private defaults: Defaults

  constructor(env: Env, defaults: Defaults) {
    this.env = env
    this.defaults = defaults
  }

  configure(): Config {
    const web = this.webConfig()
    const contact = this.contactConfig()
    return {
      keys: {
        signingKey: this.getString(KEY.SIGNING_KEY),
        encryptKey: this.getString(KEY.ENCRYPT_KEY),
      },
      github: this.githubConfig(),
      discord: this.discordConfig(),
      aws: this.awsConfig(),
      web,
      filestore: this.filestoreConfig(),
      database: this.databaseConfig(KEY.DATABASE_URL),
      mailer: this.mailerConfig(web, contact),
      redis: {
        cache: this.redisConfig(KEY.REDIS_CACHE_URL),
        workers: this.redisConfig(KEY.REDIS_WORKERS_URL),
      },
      test: {
        database: this.databaseConfig(KEY.TEST_DATABASE_URL),
        redis: this.redisConfig(KEY.REDIS_TEST_URL),
      },
      logger: this.loggerConfig(),
      contact: this.contactConfig(),
      features: this.featuresConfig(),
    }
  }

  private githubConfig(): GitHubConfig {
    return {
      oauth: this.oAuthConfig(KEY.GITHUB_CLIENT_ID, KEY.GITHUB_CLIENT_SECRET),
      accessToken: this.getOptionalString(KEY.GITHUB_ACCESS_TOKEN),
    }
  }

  private discordConfig(): DiscordConfig {
    return {
      oauth: this.oAuthConfig(KEY.DISCORD_CLIENT_ID, KEY.DISCORD_CLIENT_SECRET),
    }
  }

  private oAuthConfig(clientIdKey: KEY, clientSecretKey: KEY): oAuthConfig | undefined {
    const clientId = this.getOptionalString(clientIdKey)
    const clientSecret = this.getOptionalString(clientSecretKey)
    if (clientId && clientSecret) {
      return { clientId, clientSecret }
    }
  }

  private filestoreConfig() {
    const host = this.getString(KEY.FILESTORE_HOST)
    const port = this.getInt(KEY.FILESTORE_PORT)
    const urlstr = this.getOptionalString(KEY.FILESTORE_URL)
    const url = new URL(urlstr ? urlstr : `http://${host}:${port}`)
    const root = this.getString(KEY.FILESTORE_ROOT)
    const bucket = this.getOptionalString(KEY.FILESTORE_BUCKET)
    return {
      host,
      port,
      url,
      root,
      bucket,
    }
  }

  private mailerConfig(web: WebConfig, contact: ContactConfig) {
    const enabled = this.getBoolean(KEY.MAILER_ENABLED)
    const apiToken = this.getOptionalString(KEY.POSTMARK_API_TOKEN)
    const productName = "Void"
    const productUrl = web.publicUrl.href
    const supportEmail = contact.supportEmail
    return {
      enabled,
      apiToken,
      productName,
      productUrl,
      supportEmail,
    }
  }

  private awsConfig(): AwsConfig {
    const region = this.getString(KEY.AWS_REGION)
    const awsAccessKeyId = this.getOptionalString(KEY.AWS_ACCESS_KEY_ID)
    const awsSecretKey = this.getOptionalString(KEY.AWS_SECRET_KEY)
    const hasCredentials = awsAccessKeyId && awsSecretKey
    return {
      region,
      credentials: hasCredentials ? { awsAccessKeyId, awsSecretKey } : undefined,
    }
  }

  private webConfig(): WebConfig {
    const host = this.getString(KEY.HOST)
    const port = this.getInt(KEY.PORT)
    const publicRoot = "public"
    const publicUrl = this.publicUrl(host, port)
    const secure = publicUrl.protocol === "https:"
    const certFile = this.getOptionalString(KEY.HTTPS_CERT_FILE)
    const keyFile = this.getOptionalString(KEY.HTTPS_KEY_FILE)
    const trustProxyHeaders = this.getBoolean(KEY.TRUST_PROXY_HEADERS)
    const sessionCookieName = this.getString(KEY.SESSION_COOKIE_NAME)
    const identityCookieName = this.getString(KEY.IDENTITY_COOKIE_NAME)
    const hmr = this.getBoolean(KEY.HMR)
    const waf = this.getBoolean(KEY.WAF)
    return {
      host,
      port,
      publicRoot,
      publicUrl,
      secure,
      certFile,
      keyFile,
      trustProxyHeaders,
      sessionCookie: {
        name: sessionCookieName,
        options: cookieOptions({ secure })
      },
      identityCookie: {
        name: identityCookieName,
        options: cookieOptions({ secure })
      },
      hmr,
      waf,
    }
  }

  private databaseConfig(key: DATABASE_KEY): DatabaseConfig {
    return parseDatabaseUrl(this.getString(key))
  }

  private redisConfig(key: REDIS_KEY): RedisConfig {
    return {
      url: this.getString(key),
    }
  }

  private loggerConfig(): LoggerConfig {
    return {
      level: parseLogLevel(this.getString(KEY.LOG_LEVEL)),
      metadata: this.getOptionalString(KEY.LOG_METADATA),
      colorized: to.bool(this.getString(KEY.LOG_COLORIZED)),
      papertrailToken: this.getOptionalString(KEY.PAPERTRAIL_TOKEN),
      papertrailApp: this.getOptionalString(KEY.PAPERTRAIL_APP),
    }
  }

  private contactConfig(): ContactConfig {
    const supportEmail = this.getString(KEY.SUPPORT_EMAIL)
    return {
      supportEmail,
    }
  }

  private featuresConfig(): FeaturesConfig {
    return {
      example: this.getBoolean(KEY.FEATURE_EXAMPLE),
    }
  }

  private publicUrl(serverHost: string, serverPort: number) {
    const scheme = this.getOptionalString(KEY.URL_SCHEME) ?? "http"
    const host = this.getOptionalString(KEY.URL_HOST) ?? serverHost
    const port = this.getOptionalInt(KEY.URL_PORT) ?? serverPort
    return new URL(`${scheme}://${host}:${port}`)
  }

  //--------------

  private getString(key: KEY): string {
    return this.must(key)
  }

  private getInt(key: KEY): number {
    return to.int(this.must(key), { label: key })
  }

  private getBoolean(key: KEY): boolean {
    return to.bool(this.must(key))
  }

  private getOptionalString(key: KEY): string | undefined {
    return this.get(key)
  }

  private getOptionalInt(key: KEY): number | undefined {
    const value = this.get(key)
    return value ? to.int(value, { label: key }) : undefined
  }

  private get(key: KEY): string | undefined {
    return this.env.get(key) ?? this.defaults[key]
  }

  private must(key: KEY): string {
    const value = this.get(key)
    if (!value) {
      throw new Error(`missing configuration ${key}`)
    }
    return value
  }
}

//-----------------------------------------------------------------------------

export interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  ssl?: {
    rejectUnauthorized?: boolean
  }
}

export function parseDatabaseUrl(value: string): DatabaseConfig {
  const url = new URL(value)
  return {
    host: url.hostname,
    port: to.int(url.port, { default: 3306, label: "database port" }),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // remove leading slash
    ssl: parseSslParam(url.searchParams.get("ssl")),
  }
}

function parseSslParam(value: string | undefined | null) {
  if (value) {
    const schema = z.object({
      rejectUnauthorized: z.boolean().optional(),
    })
    return schema.parse(JSON.parse(value))
  }
}

//-----------------------------------------------------------------------------

type LogLevelConfig = "silent" | "error" | "warn" | "info" | "debug"

function parseLogLevel(level: string) {
  level = level.toLowerCase().trim()
  switch (level) {
    case "silent":
      return "silent"
    case "error":
      return "error"
    case "warn":
      return "warn"
    case "warning":
      return "warn"
    case "info":
      return "info"
    case "debug":
      return "debug"
    default:
      throw new Error(`unexpected level ${level}`)
  }
}

//-----------------------------------------------------------------------------

function cookieOptions(options?: Partial<CookieOptions>): CookieOptions {
  return {
    path: options?.path ?? "/",
    httpOnly: options?.httpOnly ?? true,
    secure: options?.secure ?? config.web.secure,
    ignoreInsecure: options?.ignoreInsecure ?? true, // SSL is handled externally so we dont listen over TLS, but we still need to be able to set secure cookies
    signed: options?.signed ?? true,
    sameSite: options?.sameSite ?? "lax",
    maxAge: options?.maxAge ?? 60 * 60 * 24 * 7, // stay logged in for 7 days
  }
}

//-----------------------------------------------------------------------------

export const config = configure(Deno.env)

//-----------------------------------------------------------------------------

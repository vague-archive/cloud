import { oak, oakCommons } from "@deps"

export { contentType as getContentType } from "@std/media-types"

export enum UrlScheme {
  Http = "http",
  Https = "https",
}

export enum Header {
  Accept = "Accept",
  Authorization = "Authorization",
  ContentType = "Content-Type",
  ContentLength = "Content-Length",
  ContentDisposition = "Content-Disposition",
  Cookie = "Cookie",
  CacheControl = "Cache-Control",
  Expires = "Expires",
  CSRFToken = "X-CSRFToken",
  CustomCommand = "X-Command",
  IfModifiedSince = "If-Modified-Since",
  Location = "Location",
  HxRedirect = "HX-Redirect",
  HxRequest = "HX-Request",
  HxRetarget = "HX-Retarget",
}

export enum ContentType {
  Json = "application/json",
  Text = "text/plain; charset=UTF-8",
  Form = "application/x-www-form-urlencoded",
  Javascript = "text/javascript",
  Css = "text/css",
  Bytes = "application/octet-stream",
  Html = "text/html",
  Wasm = "application/wasm",
}

export enum Method {
  GET = "GET",
  PUT = "PUT",
  POST = "POST",
  PATCH = "PATCH",
  DELETE = "DELETE",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

export const createHttpError = oak.createHttpError
export type ErrorStatus = oak.ErrorStatus
export const HttpError = oak.HttpError
export const isHttpError = oak.isHttpError
export const Status = oak.Status // an enum is both a value...
export type Status = oak.Status // ... and a type
export const StatusText = oak.STATUS_TEXT

export function httpError(status: oak.ErrorStatus) {
  return oakCommons.errors[oak.Status[status] as oakCommons.ErrorStatusKeys]
}

export class NotFoundError extends httpError(oak.Status.NotFound) {
  readonly path: string
  constructor(path: string) {
    super()
    this.path = path
  }
}

export function getBearerToken(value: string | null): string | undefined {
  if (value) {
    const regex = /^Bearer\s+(.+?)\s*$/
    const matches = regex.exec(value)
    if (matches && matches.length > 1) {
      return matches[1].trim()
    }
  }
}

export function forwardHeaders(ctx: oak.Context, headers: Headers) {
  for (const [key, value] of headers) {
    ctx.response.headers.set(key, value)
  }
}

export function tld(url: URL) {
  return url.hostname.split(".").slice(-2).join(".")
}

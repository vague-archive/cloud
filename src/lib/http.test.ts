import { assert, Test } from "@test"
import { ContentType, getBearerToken, Header, NotFoundError, Status, tld, UrlScheme } from "./http.ts"

//-----------------------------------------------------------------------------

Test("UrlScheme", () => {
  assert.equals(UrlScheme.Http, "http")
  assert.equals(UrlScheme.Https, "https")
})

Test("Header", () => {
  assert.equals(Header.Accept, "Accept")
  assert.equals(Header.Authorization, "Authorization")
  assert.equals(Header.ContentType, "Content-Type")
  assert.equals(Header.ContentLength, "Content-Length")
  assert.equals(Header.ContentDisposition, "Content-Disposition")
  assert.equals(Header.Cookie, "Cookie")
  assert.equals(Header.CacheControl, "Cache-Control")
  assert.equals(Header.Expires, "Expires")
  assert.equals(Header.CSRFToken, "X-CSRFToken")
  assert.equals(Header.CustomCommand, "X-Command")
  assert.equals(Header.IfModifiedSince, "If-Modified-Since")
  assert.equals(Header.Location, "Location")
  assert.equals(Header.HxRedirect, "HX-Redirect")
  assert.equals(Header.HxRequest, "HX-Request")
  assert.equals(Header.HxRetarget, "HX-Retarget")
})

Test("ContentType", () => {
  assert.equals(ContentType.Json, "application/json")
  assert.equals(ContentType.Text, "text/plain; charset=UTF-8")
  assert.equals(ContentType.Form, "application/x-www-form-urlencoded")
  assert.equals(ContentType.Javascript, "text/javascript")
  assert.equals(ContentType.Css, "text/css")
  assert.equals(ContentType.Bytes, "application/octet-stream")
  assert.equals(ContentType.Html, "text/html")
  assert.equals(ContentType.Wasm, "application/wasm")
})

//-----------------------------------------------------------------------------

Test("getBearerToken", () => {
  assert.equals(getBearerToken("Bearer secret"), "secret")
  assert.equals(getBearerToken("Bearer   secret  "), "secret")
  assert.equals(getBearerToken("Bearer secret sauce"), "secret sauce")
  assert.equals(getBearerToken("Bearer     "), "")
  assert.equals(getBearerToken("OAuth token"), undefined)
  assert.equals(getBearerToken("nope"), undefined)
  assert.equals(getBearerToken(""), undefined)
  assert.equals(getBearerToken(null), undefined)
})

//-----------------------------------------------------------------------------

Test("NotFoundError", () => {
  const err = new NotFoundError("/path")
  assert.equals(err.status, Status.NotFound)
  assert.equals(err.path, "/path")
})

//-----------------------------------------------------------------------------

Test("tld", () => {
  assert.equals(tld(new URL("https://play.void.dev")), "void.dev")
  assert.equals(tld(new URL("https://play.void.dev/")), "void.dev")
  assert.equals(tld(new URL("https://play.void.dev/foo")), "void.dev")

  assert.equals(tld(new URL("https://example.com")), "example.com")
  assert.equals(tld(new URL("https://www.example.com")), "example.com")
  assert.equals(tld(new URL("https://www.example.com/")), "example.com")
  assert.equals(tld(new URL("https://www.example.com/foo")), "example.com")
  assert.equals(tld(new URL("https://www.example.com/foo/bar")), "example.com")

  assert.equals(tld(new URL("https://foo.bar.example.com")), "example.com")
  assert.equals(tld(new URL("https://foo.bar.example.com/")), "example.com")
  assert.equals(tld(new URL("https://foo.bar.example.com/yolo")), "example.com")

  assert.equals(tld(new URL("http://localhost:3000")), "localhost")
  assert.equals(tld(new URL("http://localhost:3000/")), "localhost")
  assert.equals(tld(new URL("http://localhost:3000/foo")), "localhost")
  assert.equals(tld(new URL("http://localhost:3000/foo/bar")), "localhost")
})

//-----------------------------------------------------------------------------

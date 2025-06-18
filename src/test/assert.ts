import { JSX, oak, zod } from "@deps"
import { ContentType, ErrorStatus, Header, HttpError, httpError, NotFoundError, Status, StatusText } from "@lib/http"
import { Mailer, MailTemplate, MailTemplateData } from "@mail"
import { TestMailerConfig } from "@test"
import { CTX, AuthorizationError, RequestContext } from "@web"
import { type MinionsData, type MinionsQueue } from "@minions"

import {
  assertEquals,
  assertAlmostEquals,
  assertGreater,
  assertInstanceOf,
  assertMatch as $assertMatch,
  assertNotEquals,
  assertRejects,
  assertThrows,
  assertNotMatch as $assertNotMatch,
} from "@std/assert"

import {
  assert as $assert,
  RuntimeAssertions,
} from "@lib/assert"

//-----------------------------------------------------------------------------

function assertMatch(value: string, expected: string | RegExp, message?: string) {
  const re = expected instanceof RegExp ? expected : new RegExp(expected)
  $assertMatch(value, re, message)
}

//-----------------------------------------------------------------------------

function assertNotMatch(value: string, expected: string | RegExp, message?: string) {
  const re = expected instanceof RegExp ? expected : new RegExp(expected)
  $assertNotMatch(value, re, message)
}

//-----------------------------------------------------------------------------
function assertZodError(value: unknown): asserts value is zod.ZodError {
  assert.instanceOf(value, zod.ZodError)
}

function assertZodIssue(error: zod.ZodError, field: string, expected: string | string[]) {
  expected = Array.isArray(expected) ? expected : [expected]
  assert.equals(error.flatten().fieldErrors[field], expected)
}

function assertZodNoIssue(error: zod.ZodError, field: string) {
  assert.equals(error.flatten().fieldErrors[field], undefined)
}

function assertZodStringMissing(error: zod.ZodError, field: string, expected?: { message?: string }) {
  assertZodTooSmall(error, field, {
    message: expected?.message ?? "Value required",
  })
}

function assertZodTooSmall(error: zod.ZodError, field: string, expected?: { minimum?: number; message?: string }) {
  const issue = findZodIssue(error, field, "too_small")
  const expectedMinimum = expected?.minimum ?? 1
  const expectedMessage = expected?.message ?? `String must contain at least ${expectedMinimum} character(s)`
  assertZodIssueCode(issue.code, "too_small")
  assert.equals(issue.minimum, expectedMinimum)
  assert.equals(issue.message, expectedMessage)
}

function assertZodInvalidEnum(error: zod.ZodError, field: string, expected: string[]) {
  const issue = findZodIssue(error, field, "invalid_enum_value")
  assertZodIssueCode(issue.code, "invalid_enum_value")
  assert.equals(issue.options, expected)
}

function assertZodCustomError(error: zod.ZodError, field: string, expectedMessage: string) {
  const issue = findZodIssue(error, field, "custom")
  assertZodIssueCode(issue.code, "custom")
  assert.equals(issue.message, expectedMessage)
}

function findZodIssue<T extends string>(error: zod.ZodError, field: string, code: T) {
  const issue = error.issues.find((i) => i.path[0] === field && i.code === code)
  assert.present(issue, `expected ${code} on ${field} but didn't find it`)
  return issue
}

function assertZodIssueCode<T extends string>(value: string, expected: T): asserts value is T {
  assert.equals(value, expected)
}

//-----------------------------------------------------------------------------

function assertHttpError(
  err: unknown,
  expectedStatus?: ErrorStatus,
  expectedMessage?: string,
): asserts err is typeof HttpError {
  expectedStatus = expectedStatus ?? Status.InternalServerError
  expectedMessage = expectedMessage ?? StatusText[expectedStatus]
  assert.instanceOf(err, httpError(expectedStatus))
  assert.equals(err.status, expectedStatus)
  assert.equals(err.message, expectedMessage)
}

async function assertThrowsHttpError(
  fn: () => unknown,
  expectedStatus?: ErrorStatus,
  expectedMessage?: string,
) {
  try {
    await fn()
    assert.failed(`function did not throw HttpError (${expectedStatus})`)
  } catch (e) {
    assert.httpError(e, expectedStatus, expectedMessage)
    return e
  }
}

async function assertThrowsNotFoundError(fn: () => void) {
  const err = await assertThrowsHttpError(fn, Status.NotFound)
  assert.instanceOf(err, NotFoundError)
  return err
}

async function assertThrowsAuthorizationError(fn: () => void) {
  const err = await assertThrowsHttpError(fn, Status.Forbidden)
  assert.instanceOf(err, AuthorizationError)
  return err
}

//-----------------------------------------------------------------------------

type ResponseLike = Response | oak.Response | undefined

function isOakResponse(response: ResponseLike): response is oak.Response {
  assert.present(response)
  return response instanceof oak.Response
}

function assertResponseStatus(response: ResponseLike, expected: Status) {
  assert.present(response)
  assert.equals(response.status, expected)
}

function assertResponseOk(response: ResponseLike) {
  assert.response.status(response, Status.OK)
}

function assertResponseNotFound(response: ResponseLike) {
  assert.response.status(response, Status.NotFound)
}

function assertResponseFound(response: ResponseLike, expectedLocation: string) {
  assert.response.status(response, Status.Found)
  assert.response.headerMatch(response, Header.Location, expectedLocation)
}

function assertResponseHxRedirect(response: ResponseLike, expectedLocation: string) {
  assert.response.status(response, Status.OK)
  assert.response.header(response, Header.HxRedirect, expectedLocation)
}

function assertResponseHxRetarget(response: ResponseLike, expectedSelector: string) {
  assert.response.status(response, Status.OK)
  assert.response.header(response, Header.HxRetarget, expectedSelector)
}

function assertResponseHeader(response: ResponseLike, header: Header, expected: string) {
  assert.present(response)
  assert.equals(response.headers.get(header), expected)
}

function assertResponseHeaderMatch(response: ResponseLike, header: Header, expected: string){
  assert.present(response)
  assert.match(response.headers.get(header) || "", expected)
}

function assertResponseContentType(response: ResponseLike, expectedContentType: ContentType) {
  assert.response.header(response, Header.ContentType, expectedContentType)
}

async function assertResponseText(response: ResponseLike | undefined, expectedStatus = Status.OK) {
  assert.present(response)
  assert.response.status(response, expectedStatus)
  assert.response.contentType(response, ContentType.Text)
  if (isOakResponse(response)) {
    assert.isString(response.body)
    return response.body
  } else {
    assert.instanceOf(response.body, ReadableStream<Uint8Array>)
    return await response.text()
  }
}

async function assertResponseJson(response: ResponseLike, expectedStatus = Status.OK) {
  assert.present(response)
  assert.response.status(response, expectedStatus)
  assert.response.contentType(response, ContentType.Json)
  if (isOakResponse(response)) {
    assert.isString(response.body)
    return JSON.parse(response.body)
  } else {
    assert.instanceOf(response.body, ReadableStream<Uint8Array>)
    return JSON.parse(await response.text())
  }
}

function assertResponseBytes(response: ResponseLike, expectedStatus = Status.OK): ReadableStream<Uint8Array> {
  assert.present(response)
  assert.response.status(response, expectedStatus)
  assert.response.contentType(response, ContentType.Bytes)
  assert.instanceOf(response.body, ReadableStream<Uint8Array>)
  return response.body
}

interface ResponseAssertions {
  status: typeof assertResponseStatus
  header: typeof assertResponseHeader
  headerMatch: typeof assertResponseHeaderMatch
  ok: typeof assertResponseOk
  notFound: typeof assertResponseNotFound
  found: typeof assertResponseFound
  text: typeof assertResponseText
  json: typeof assertResponseJson
  bytes: typeof assertResponseBytes
  contentType: typeof assertResponseContentType
  hx: {
    redirect: typeof assertResponseHxRedirect
    retarget: typeof assertResponseHxRetarget
  }
}

const assertResponse: ResponseAssertions = {
  status: assertResponseStatus,
  header: assertResponseHeader,
  headerMatch: assertResponseHeaderMatch,
  ok: assertResponseOk,
  notFound: assertResponseNotFound,
  found: assertResponseFound,
  text: assertResponseText,
  json: assertResponseJson,
  bytes: assertResponseBytes,
  contentType: assertResponseContentType,
  hx: {
    redirect: assertResponseHxRedirect,
    retarget: assertResponseHxRetarget,
  }
}

//-----------------------------------------------------------------------------

interface MockMinions {
  messages: MinionsData[]
}

function assertIsMockMinions(q: unknown): asserts q is MockMinions {
  $assert.present(q)
  $assert.isObject(q)
  $assert.true("messages" in q)
}

function assertMinion(q: MinionsQueue, expected: MinionsData) {
  assertIsMockMinions(q)
  const message = q.messages.shift()
  assert.present(message)
  assert.equals(message, expected)
}

function assertNoMinions(q: MinionsQueue) {
  assertIsMockMinions(q)
  assert.equals(q.messages.length, 0)
}

//-----------------------------------------------------------------------------

function assertMail(mail: MailTemplate, template: string, expected: {
  from?: string,
  to: string,
} & MailTemplateData) {

  let { from, to, ...rest } = expected
  from = from ?? TestMailerConfig.supportEmail

  const data = {
    product_name: TestMailerConfig.productName,
    product_url: TestMailerConfig.productUrl,
    support_email: TestMailerConfig.supportEmail,
    ...rest,
  }

  assert.equals(mail.template, template, `expected ${template} mail, but found ${mail.template} sent instead`)
  assert.equals(mail.from, from, `expected mail sent from ${from}, but was ${mail.from}`)
  assert.equals(mail.to, to, `expected mail sent to ${to}, but was ${mail.to}`)
  assert.equals(mail.data, data)
}

function assertMailed(ctx: RequestContext | Mailer, template: string, expected: {
  from?: string,
  to: string,
  more?: boolean,
} & MailTemplateData) {
  const mailer = ctx instanceof Mailer ? ctx : CTX.mailer(ctx)
  const mail = mailer.sent()

  assert.present(mail, `expected ${template} mail, but no mail has been sent`)

  const { more, ...rest } = expected
  assertMail(mail, template, rest)
  if (!more) {
    assert.equals(mailer.count(), 0)
    assert.equals(mailer.sent(), undefined)
  } else {
    assert.true(mailer.count() > 0, "expected more mail to have been sent, but found none")
  }
  return mail
}

function assertNothingMailed(ctx: RequestContext | Mailer) {
  const mailer = ctx instanceof Mailer ? ctx : ctx.state.mailer
  assert.equals(mailer.count(), 0)
  assert.equals(mailer.sent(), undefined)
}

//-----------------------------------------------------------------------------

function assertJsxComponentName(element: JSX.Element, expectedName: string) {
  // deno-lint-ignore ban-types
  const fn = element.type as unknown as Function
  assert.equals(fn.name, expectedName)
}

//-----------------------------------------------------------------------------

interface TestAssertions extends RuntimeAssertions {
  equals: typeof assertEquals
  almostEquals: typeof assertAlmostEquals
  notEquals: typeof assertNotEquals
  match: typeof assertMatch
  notMatch: typeof assertNotMatch
  greater: typeof assertGreater
  instanceOf: typeof assertInstanceOf
  response: typeof assertResponse
  zodError: typeof assertZodError
  zodIssue: typeof assertZodIssue
  zodNoIssue: typeof assertZodNoIssue
  zodStringMissing: typeof assertZodStringMissing
  zodTooSmall: typeof assertZodTooSmall
  zodInvalidEnum: typeof assertZodInvalidEnum
  zodCustomError: typeof assertZodCustomError
  throws: typeof assertThrows
  rejects: typeof assertRejects
  httpError: typeof assertHttpError
  throwsHttpError: typeof assertThrowsHttpError
  throwsNotFoundError: typeof assertThrowsNotFoundError
  throwsAuthorizationError: typeof assertThrowsAuthorizationError
  minion: typeof assertMinion
  noMinions: typeof assertNoMinions
  mail: typeof assertMail
  mailed: typeof assertMailed
  nothingMailed: typeof assertNothingMailed
  jsx: {
    componentName: typeof assertJsxComponentName
  }
}

export const assert: TestAssertions = {
  ...$assert,
  equals: assertEquals,
  almostEquals: assertAlmostEquals,
  notEquals: assertNotEquals,
  match: assertMatch,
  notMatch: assertNotMatch,
  greater: assertGreater,
  instanceOf: assertInstanceOf,
  response: assertResponse,
  zodError: assertZodError,
  zodIssue: assertZodIssue,
  zodNoIssue: assertZodNoIssue,
  zodStringMissing: assertZodStringMissing,
  zodTooSmall: assertZodTooSmall,
  zodInvalidEnum: assertZodInvalidEnum,
  zodCustomError: assertZodCustomError,
  throws: assertThrows,
  rejects: assertRejects,
  httpError: assertHttpError,
  throwsHttpError: assertThrowsHttpError,
  throwsNotFoundError: assertThrowsNotFoundError,
  throwsAuthorizationError: assertThrowsAuthorizationError,
  minion: assertMinion,
  noMinions: assertNoMinions,
  mail: assertMail,
  mailed: assertMailed,
  nothingMailed: assertNothingMailed,
  jsx: {
    componentName: assertJsxComponentName,
  },
}

//-----------------------------------------------------------------------------
